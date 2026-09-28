import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { Document, DocumentType } from './entities/document.entity';
import { Property } from '../properties/entities/property.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Client } from '../clients/entities/client.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentRepo: Record<string, jest.Mock>;
  let propertyRepo: Record<string, jest.Mock>;
  let tenantRepo: Record<string, jest.Mock>;
  let clientRepo: Record<string, jest.Mock>;
  let invoiceRepo: Record<string, jest.Mock>;
  let qb: Record<string, jest.Mock>;

  const AGENCY = 'agency-1';
  const OTHER_AGENCY = 'agency-2';
  const PROPERTY = 'property-1';
  const TENANT = 'tenant-1';
  const CLIENT = 'client-1';
  const INVOICE = 'invoice-1';

  const chainable = () => {
    const q: Record<string, jest.Mock> = {};
    for (const m of [
      'leftJoinAndSelect',
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'skip',
      'take',
    ]) {
      q[m] = jest.fn().mockReturnThis();
    }
    return q;
  };

  const file = (over: Partial<Express.Multer.File> = {}): Express.Multer.File =>
    ({
      filename: '1700000000-abcdef.pdf',
      originalname: 'Contrat de bail.pdf',
      mimetype: 'application/pdf',
      size: 2048,
      ...over,
    }) as Express.Multer.File;

  const makeDocument = (over: Partial<Document> = {}): Document =>
    ({
      id: 'doc-1',
      agencyId: AGENCY,
      title: 'Contrat de bail',
      description: null,
      documentType: DocumentType.LEASE_CONTRACT,
      filename: '1700000000-abcdef.pdf',
      originalName: 'Contrat de bail.pdf',
      mimeType: 'application/pdf',
      size: 2048,
      propertyId: null,
      tenantId: null,
      clientId: null,
      invoiceId: null,
      ...over,
    }) as Document;

  beforeEach(async () => {
    qb = chainable();
    qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

    documentRepo = {
      create: jest.fn((data) => ({ id: 'doc-1', ...data })),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => qb),
    };
    propertyRepo = { findOne: jest.fn().mockResolvedValue({ id: PROPERTY }) };
    tenantRepo = { findOne: jest.fn().mockResolvedValue({ id: TENANT }) };
    clientRepo = { findOne: jest.fn().mockResolvedValue({ id: CLIENT }) };
    invoiceRepo = { findOne: jest.fn().mockResolvedValue({ id: INVOICE }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: getRepositoryToken(Document), useValue: documentRepo },
        { provide: getRepositoryToken(Property), useValue: propertyRepo },
        { provide: getRepositoryToken(Tenant), useValue: tenantRepo },
        { provide: getRepositoryToken(Client), useValue: clientRepo },
        { provide: getRepositoryToken(Invoice), useValue: invoiceRepo },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('takes the agency from the argument, never from the body', async () => {
      await service.create(
        { title: 'Contrat', agencyId: OTHER_AGENCY },
        AGENCY,
        file(),
      );
      expect(documentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ agencyId: AGENCY }),
      );
    });

    it('takes the stored filename, size and mime type from the upload', async () => {
      // `filename` is what `FileAccessGuard` resolves a request by, so a client
      // that could set it would point a document at another document's bytes.
      await service.create({ title: 'Contrat' }, AGENCY, file());
      expect(documentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: '1700000000-abcdef.pdf',
          originalName: 'Contrat de bail.pdf',
          mimeType: 'application/pdf',
          size: 2048,
        }),
      );
    });

    it('defaults the type to other', async () => {
      await service.create({ title: 'Sans type' }, AGENCY, file());
      expect(documentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ documentType: DocumentType.OTHER }),
      );
    });

    it('refuses without a file', async () => {
      await expect(
        service.create({ title: 'Contrat' }, AGENCY, undefined as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(documentRepo.save).not.toHaveBeenCalled();
    });

    it('stores absent relations as null rather than leaving them undefined', async () => {
      await service.create({ title: 'Contrat' }, AGENCY, file());
      expect(documentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: null,
          tenantId: null,
          clientId: null,
          invoiceId: null,
        }),
      );
    });

    it.each([
      ['propertyId', PROPERTY, () => propertyRepo.findOne],
      ['tenantId', TENANT, () => tenantRepo.findOne],
      ['clientId', CLIENT, () => clientRepo.findOne],
      ['invoiceId', INVOICE, () => invoiceRepo.findOne],
    ])(
      'refuses a %s from another agency and writes no row',
      async (key, value, get) => {
        get().mockResolvedValue(null);
        await expect(
          service.create(
            { title: 'Contrat', [key]: value } as never,
            AGENCY,
            file(),
          ),
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(documentRepo.save).not.toHaveBeenCalled();
      },
    );

    it('checks the relation with the agency in the same where', async () => {
      await service.create(
        { title: 'Contrat', propertyId: PROPERTY },
        AGENCY,
        file(),
      );
      expect(propertyRepo.findOne).toHaveBeenCalledWith({
        where: { id: PROPERTY, agencyId: AGENCY },
        select: ['id'],
      });
    });
  });

  describe('findAll', () => {
    it('scopes on the document agency_id in the query itself', async () => {
      await service.findAll(AGENCY);
      expect(qb.where).toHaveBeenCalledWith('document.agencyId = :agencyId', {
        agencyId: AGENCY,
      });
    });

    it('applies the type and relation filters', async () => {
      await service.findAll(AGENCY, {
        documentType: DocumentType.LEASE_CONTRACT,
        propertyId: PROPERTY,
        tenantId: TENANT,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'document.documentType = :documentType',
        {
          documentType: DocumentType.LEASE_CONTRACT,
        },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'document.propertyId = :propertyId',
        {
          propertyId: PROPERTY,
        },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'document.tenantId = :tenantId',
        {
          tenantId: TENANT,
        },
      );
    });

    it('orders by property name, not the created_at column', async () => {
      await service.findAll(AGENCY);
      expect(qb.orderBy).toHaveBeenCalledWith('document.createdAt', 'DESC');
      expect(qb.orderBy).not.toHaveBeenCalledWith(
        'document.created_at',
        'DESC',
      );
    });

    it('escapes % and _ so a search is a literal search', async () => {
      await service.findAll(AGENCY, { search: '100%_a' });
      const call = qb.andWhere.mock.calls.find((c) =>
        String(c[0]).includes('ILIKE'),
      );
      expect(call?.[1]).toEqual({ term: '%100\\%\\_a%' });
    });

    it('returns the flat PaginatedResponse envelope', async () => {
      qb.getManyAndCount.mockResolvedValue([[makeDocument()], 1]);
      const result = await service.findAll(AGENCY);
      expect(result).toBeInstanceOf(PaginatedResponse);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('caps the page size at 100', async () => {
      await service.findAll(AGENCY, { limit: 5000 });
      expect(qb.take).toHaveBeenCalledWith(100);
    });
  });

  describe('findOne', () => {
    it('scopes on both id and agency', async () => {
      documentRepo.findOne.mockResolvedValue(makeDocument());
      await service.findOne('doc-1', AGENCY);
      expect(documentRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'doc-1', agencyId: AGENCY } }),
      );
    });

    it("404s another agency's document", async () => {
      documentRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('doc-1', AGENCY)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      documentRepo.findOne.mockResolvedValue(makeDocument());
    });

    it('refuses to let a body retarget the agency', async () => {
      await service.update('doc-1', AGENCY, { agencyId: OTHER_AGENCY });
      expect(documentRepo.update).toHaveBeenCalledWith(
        { id: 'doc-1', agencyId: AGENCY },
        expect.not.objectContaining({ agencyId: OTHER_AGENCY }),
      );
    });

    it('re-checks the agency when a relation changes', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('doc-1', AGENCY, { tenantId: 'other' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(documentRepo.update).not.toHaveBeenCalled();
    });

    it('404s an update aimed at another agency', async () => {
      documentRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('doc-1', AGENCY, { title: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(documentRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('scopes the delete on the agency', async () => {
      documentRepo.findOne.mockResolvedValue(makeDocument());
      await service.remove('doc-1', AGENCY);
      expect(documentRepo.delete).toHaveBeenCalledWith({
        id: 'doc-1',
        agencyId: AGENCY,
      });
    });

    it("404s another agency's document without deleting anything", async () => {
      documentRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('doc-1', AGENCY)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(documentRepo.delete).not.toHaveBeenCalled();
    });
  });
});
