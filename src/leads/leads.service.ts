import { Injectable, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ErrorHandler } from '../common/utils/error-handler';
import { ClientsService } from '../clients/clients.service';
import { CreateClientDto } from '../clients/dto/create-client.dto';
import { BaseService } from '../common/services/base.service';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

@Injectable()
export class LeadsService extends BaseService<Lead> {
  constructor(
    @InjectRepository(Lead)
    protected readonly leadRepository: Repository<Lead>,
    @Inject(forwardRef(() => ClientsService))
    private readonly clientsService: ClientsService,
  ) {
    super(leadRepository);
  }

  protected getEntityName(): string {
    return 'Lead';
  }

  async create(createLeadDto: CreateLeadDto, agencyId: string): Promise<Lead> {
    return this.baseCreate({
      ...createLeadDto,
      agencyId,
      source: 'public_portal',
    });
  }

  async findAll(
    agencyId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<Lead> | Lead[]> {
    return this.baseFindAll(agencyId, page, limit, {
      relations: ['property'],
      order: { createdAt: 'DESC' } as any,
    });
  }

  async findOne(id: string, agencyId: string): Promise<Lead> {
    return this.baseFindOne(id, agencyId, {
      relations: ['property'],
    });
  }

  async convertToClient(id: string, agencyId: string): Promise<{ lead: Lead; clientId: string }> {
    try {
      const lead = await this.findOne(id, agencyId);

      if (lead.isConverted) {
        throw new BadRequestException('Lead has already been converted to a client');
      }

      // Create client from lead data
      const createClientDto: CreateClientDto = {
        agencyId: lead.agencyId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        notes: `Converted from lead. Original message: ${lead.message}`,
      };

      const client = await this.clientsService.create(createClientDto);

      // Mark lead as converted
      lead.isConverted = true;
      lead.convertedToClientId = client.id;
      await this.leadRepository.save(lead);

      return { lead, clientId: client.id };
    } catch (error) {
      ErrorHandler.handle(error, 'LeadsService.convertToClient');
    }
  }
}
