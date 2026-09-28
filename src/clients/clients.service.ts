import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { FilterClientDto } from './dto/filter-client.dto';
import { ErrorHandler } from '../common/utils/error-handler';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { BaseService } from '../common/services/base.service';

@Injectable()
export class ClientsService extends BaseService<Client> {
  constructor(
    @InjectRepository(Client)
    protected readonly clientRepository: Repository<Client>,
  ) {
    super(clientRepository);
  }

  protected getEntityName(): string {
    return 'Client';
  }

  async create(createClientDto: CreateClientDto): Promise<Client> {
    try {
      // Validate budget range if both are provided
      if (
        createClientDto.budgetMin !== undefined &&
        createClientDto.budgetMax !== undefined
      ) {
        if (createClientDto.budgetMax < createClientDto.budgetMin) {
          throw new BadRequestException(
            'Budget maximum must be greater than or equal to budget minimum',
          );
        }
      }

      return await this.baseCreate(createClientDto);
    } catch (error) {
      ErrorHandler.handle(error, 'ClientsService.create');
    }
  }

  async findAll(
    agencyId: string,
    filter: FilterClientDto = {},
  ): Promise<PaginatedResponse<Client>> {
    const { page = 1, limit = 20, status, search } = filter;

    const query = this.repository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.user', 'user')
      .where('client.agencyId = :agencyId', { agencyId });

    if (status) {
      query.andWhere('client.status = :status', { status });
    }

    if (search) {
      // ILIKE with the wildcards added here, not by the caller, so a search for
      // "100%" is a literal search rather than a match-everything one.
      const term = search.trim().replace(/[%_]/g, (c) => `\\${c}`);
      query.andWhere(
        `(client.firstName ILIKE :term OR client.lastName ILIKE :term
          OR client.email ILIKE :term
          OR (client.firstName || ' ' || client.lastName) ILIKE :term)`,
        { term: `%${term}%` },
      );
    }

    const effectiveLimit = Math.min(limit, 100);
    const [clients, total] = await query
      .skip((page - 1) * effectiveLimit)
      .take(effectiveLimit)
      .orderBy('client.createdAt', 'DESC')
      .getManyAndCount();

    return new PaginatedResponse(clients, total, page, effectiveLimit);
  }

  async findOne(id: string, agencyId: string): Promise<Client> {
    return this.baseFindOne(id, agencyId, {
      relations: ['user'],
    });
  }

  async update(
    id: string,
    agencyId: string,
    updateClientDto: UpdateClientDto,
  ): Promise<Client> {
    try {
      const client = await this.findOne(id, agencyId);

      // Validate budget range if both are provided
      const newBudgetMin =
        updateClientDto.budgetMin !== undefined
          ? updateClientDto.budgetMin
          : client.budgetMin;
      const newBudgetMax =
        updateClientDto.budgetMax !== undefined
          ? updateClientDto.budgetMax
          : client.budgetMax;

      if (
        newBudgetMin !== null &&
        newBudgetMax !== null &&
        newBudgetMax < newBudgetMin
      ) {
        throw new BadRequestException(
          'Budget maximum must be greater than or equal to budget minimum',
        );
      }

      return await this.baseUpdate(id, updateClientDto, agencyId);
    } catch (error) {
      ErrorHandler.handle(error, 'ClientsService.update');
    }
  }

  async remove(id: string, agencyId: string): Promise<void> {
    return this.baseRemove(id, agencyId);
  }
}
