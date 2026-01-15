import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { MatchPropertiesDto } from './dto/match-properties.dto';
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
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<Client> | Client[]> {
    return this.baseFindAll(agencyId, page, limit, {
      relations: ['user'],
      order: { createdAt: 'DESC' } as any,
    });
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

  async matchProperties(
    agencyId: string,
    criteria: MatchPropertiesDto,
  ): Promise<Array<Client & { matchScore: number }>> {
    try {
      // Get all clients for the agency
      const clients = await this.repository.find({
        where: { agencyId },
        relations: ['user'],
      });

      // Calculate match score for each client
      const clientsWithScores = clients
        .map((client) => this.calculateClientMatchScore(client, criteria))
        .filter((client) => client.matchScore > 0) // Only return clients with at least one match
        .sort((a, b) => b.matchScore - a.matchScore); // Sort by match score descending

      return clientsWithScores;
    } catch (error) {
      ErrorHandler.handle(error, 'ClientsService.matchProperties');
    }
  }

  private calculateClientMatchScore(
    client: Client,
    criteria: MatchPropertiesDto,
  ): Client & { matchScore: number } {
    let matchScore = 0;
    let totalCriteria = 0;

    // Check property type match
    if (this.hasPropertyTypeMatch(client, criteria.type)) {
      totalCriteria++;
      matchScore++;
    } else if (criteria.type && client.preferredPropertyType?.length > 0) {
      totalCriteria++;
    }

    // Check location match
    if (this.hasLocationMatch(client, criteria.city)) {
      totalCriteria++;
      matchScore++;
    } else if (criteria.city && client.preferredLocation?.length > 0) {
      totalCriteria++;
    }

    // Check budget match
    if (this.hasBudgetMatch(client, criteria.price)) {
      totalCriteria++;
      matchScore++;
    } else if (criteria.price !== undefined) {
      totalCriteria++;
    }

    // Calculate percentage match (0-100)
    const matchPercentage =
      totalCriteria > 0 ? (matchScore / totalCriteria) * 100 : 0;

    return {
      ...client,
      matchScore: Math.round(matchPercentage),
    };
  }

  private hasPropertyTypeMatch(client: Client, propertyType?: string): boolean {
    if (!propertyType || !client.preferredPropertyType?.length) {
      return false;
    }
    return client.preferredPropertyType.includes(propertyType);
  }

  private hasLocationMatch(client: Client, city?: string): boolean {
    if (!city || !client.preferredLocation?.length) {
      return false;
    }
    const normalizedCity = city.toLowerCase();
    return client.preferredLocation.some((location) =>
      location.toLowerCase().includes(normalizedCity),
    );
  }

  private hasBudgetMatch(client: Client, price?: number): boolean {
    if (price === undefined) {
      return false;
    }
    const priceInRange =
      (client.budgetMin === null || price >= client.budgetMin) &&
      (client.budgetMax === null || price <= client.budgetMax);
    return priceInRange;
  }
}
