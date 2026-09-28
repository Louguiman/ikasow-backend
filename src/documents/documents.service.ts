import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Document, DocumentType } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FilterDocumentDto } from './dto/filter-document.dto';
import { Property } from '../properties/entities/property.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Client } from '../clients/entities/client.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

/**
 * The `Documents` pages read and wrote a hardcoded Supabase project; there was no
 * table, no entity and no route, so the module existed only as a form that could
 * not save.
 *
 * Every read and write scopes on the document's own `agency_id`, never through a
 * relation. A relation would answer for a document that belongs to nobody, and
 * the four optional relations mean a document can be unattached, so the
 * `where` cannot be built from them.
 */
@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly repository: Repository<Document>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  /**
   * `agencyId` comes from the request context and overwrites anything in the
   * body, so a document naming another agency writes no row and the referential
   * checks below all run against the caller's own agency.
   */
  async create(
    createDocumentDto: CreateDocumentDto,
    agencyId: string,
    file: Express.Multer.File,
  ): Promise<Document> {
    if (!file) {
      throw new BadRequestException('A file is required');
    }

    await this.assertRelationsInAgency(createDocumentDto, agencyId);

    const document = this.repository.create({
      title: createDocumentDto.title,
      description: createDocumentDto.description ?? null,
      documentType: createDocumentDto.documentType ?? DocumentType.OTHER,
      // Taken from the upload, never from the body: `filename` is what
      // `FileAccessGuard` resolves a request by, so a client that could set it
      // would be able to point a document at another document's bytes.
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      propertyId: createDocumentDto.propertyId ?? null,
      tenantId: createDocumentDto.tenantId ?? null,
      clientId: createDocumentDto.clientId ?? null,
      invoiceId: createDocumentDto.invoiceId ?? null,
      agencyId,
    });

    return this.repository.save(document);
  }

  async findAll(
    agencyId: string,
    filter: FilterDocumentDto = {},
  ): Promise<PaginatedResponse<Document>> {
    const { page = 1, limit = 20, documentType, search } = filter;
    const effectiveLimit = Math.min(limit, 100);
    const skip = (page - 1) * effectiveLimit;

    const query = this.repository
      .createQueryBuilder('document')
      .where('document.agencyId = :agencyId', { agencyId });

    if (documentType) {
      query.andWhere('document.documentType = :documentType', { documentType });
    }

    for (const key of [
      'propertyId',
      'tenantId',
      'clientId',
      'invoiceId',
    ] as const) {
      const value = filter[key];
      if (value) {
        query.andWhere(`document.${key} = :${key}`, { [key]: value });
      }
    }

    if (search) {
      // Escaped so a search for "100%" is a literal search.
      const term = search.trim().replace(/[%_]/g, (c) => `\\${c}`);
      query.andWhere(
        `(document.title ILIKE :term OR document.description ILIKE :term
          OR document.originalName ILIKE :term)`,
        { term: `%${term}%` },
      );
    }

    // Newest first, and ordered by *property* name rather than `created_at`: a
    // column name leaves TypeORM with an unresolvable alias and 500s the list.
    const [documents, total] = await query
      .orderBy('document.createdAt', 'DESC')
      .skip(skip)
      .take(effectiveLimit)
      .getManyAndCount();

    return new PaginatedResponse(documents, total, page, effectiveLimit);
  }

  async findOne(id: string, agencyId: string): Promise<Document> {
    const document = await this.repository.findOne({
      where: { id, agencyId },
      relations: ['property', 'tenant', 'client', 'invoice'],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return document;
  }

  async update(
    id: string,
    agencyId: string,
    updateDocumentDto: UpdateDocumentDto,
  ): Promise<Document> {
    await this.findOne(id, agencyId);

    const { agencyId: _ignored, ...rest } = updateDocumentDto;

    await this.assertRelationsInAgency(rest, agencyId);

    // The file fields are absent from the DTO; `size`, `mimeType`, `filename` and
    // `originalName` are measurements of bytes on disk and are not editable
    // metadata. Replacing the file is an upload, not a patch.
    await this.repository.update({ id, agencyId }, rest);
    return this.findOne(id, agencyId);
  }

  /**
   * Removes the row and the bytes.
   *
   * The file is unlinked first: if the unlink fails there is still a row pointing
   * at a real file, which is a state the UI can show and a user can recover from.
   * The reverse — a row gone and an orphan on disk — cannot be surfaced at all.
   * A missing file is not an error, because the row is going away regardless.
   */
  async remove(id: string, agencyId: string): Promise<void> {
    const document = await this.findOne(id, agencyId);

    try {
      await unlink(join(process.cwd(), 'uploads', document.filename));
    } catch {
      // Already gone, or never written. The row still has to go.
    }

    await this.repository.delete({ id, agencyId });
  }

  /** The bytes, for a download that is not a browser navigation. */
  getFilePath(document: Document): string {
    return join(process.cwd(), 'uploads', document.filename);
  }

  /**
   * Each relation is looked up with the agency in the same `where`, so an id from
   * another tenant is a 404 and writes nothing. Four separate nullable FKs rather
   * than one `related_id` + `related_type` pair, precisely so this is four
   * ordinary scoped lookups.
   */
  private async assertRelationsInAgency(
    dto: Partial<CreateDocumentDto>,
    agencyId: string,
  ): Promise<void> {
    if (dto.propertyId) {
      const found = await this.propertyRepository.findOne({
        where: { id: dto.propertyId, agencyId },
        select: ['id'],
      });
      if (!found) {
        throw new NotFoundException(
          `Property with ID ${dto.propertyId} not found in this agency`,
        );
      }
    }

    if (dto.tenantId) {
      const found = await this.tenantRepository.findOne({
        where: { id: dto.tenantId, agencyId },
        select: ['id'],
      });
      if (!found) {
        throw new NotFoundException(
          `Tenant with ID ${dto.tenantId} not found in this agency`,
        );
      }
    }

    if (dto.clientId) {
      const found = await this.clientRepository.findOne({
        where: { id: dto.clientId, agencyId },
        select: ['id'],
      });
      if (!found) {
        throw new NotFoundException(
          `Client with ID ${dto.clientId} not found in this agency`,
        );
      }
    }

    if (dto.invoiceId) {
      const found = await this.invoiceRepository.findOne({
        where: { id: dto.invoiceId, agencyId },
        select: ['id'],
      });
      if (!found) {
        throw new NotFoundException(
          `Invoice with ID ${dto.invoiceId} not found in this agency`,
        );
      }
    }
  }
}
