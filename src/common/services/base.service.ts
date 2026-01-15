import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository, FindManyOptions, FindOptionsWhere, DeepPartial } from 'typeorm';
import { ErrorHandler } from '../utils/error-handler';
import { PaginatedResponse } from '../dto/paginated-response.dto';

/**
 * Base service class providing common CRUD operations for all entities.
 * Services should extend this class to inherit standard functionality.
 * 
 * @template T - The entity type this service manages
 */
@Injectable()
export abstract class BaseService<T extends { id: string }> {
  constructor(protected readonly repository: Repository<T>) { }

  /**
   * Get the entity name for error messages
   * @returns The human-readable entity name
   */
  protected abstract getEntityName(): string;

  /**
   * Create a new entity
   * @param data - The data to create the entity with
   * @returns The created entity
   */
  protected async baseCreate(data: DeepPartial<T>): Promise<T> {
    try {
      const entity = this.repository.create(data);
      return await this.repository.save(entity);
    } catch (error) {
      ErrorHandler.handle(error, `${this.getEntityName()}Service.create`);
    }
  }

  /**
   * Find all entities with optional pagination and agency scoping
   * @param agencyId - Optional agency ID for scoping
   * @param page - Page number (1-indexed)
   * @param limit - Number of items per page
   * @param options - Additional find options (e.g., relations, filters)
   * @returns Paginated response with entities
   */
  protected async baseFindAll(
    agencyId?: string,
    page?: number,
    limit?: number,
    options?: FindManyOptions<T>,
  ): Promise<PaginatedResponse<T> | T[]> {
    try {
      const where: any = options?.where || {};
      if (agencyId) {
        where.agencyId = agencyId;
      }

      const findOptions: FindManyOptions<T> = {
        ...options,
        where,
      };

      // If pagination parameters are provided, return paginated response
      if (page !== undefined && limit !== undefined) {
        const effectiveLimit = Math.min(limit, 100);
        const skip = (page - 1) * effectiveLimit;

        const [entities, total] = await this.repository.findAndCount({
          ...findOptions,
          skip,
          take: effectiveLimit,
        });

        return new PaginatedResponse(entities, total, page, effectiveLimit);
      }

      // Otherwise, return all entities matching the query
      return await this.repository.find(findOptions);
    } catch (error) {
      ErrorHandler.handle(error, `${this.getEntityName()}Service.findAll`);
    }
  }

  /**
   * Find a single entity by ID with optional agency scoping
   * @param id - The entity ID
   * @param agencyId - Optional agency ID for scoping
   * @param options - Additional find options (e.g., relations)
   * @returns The found entity
   * @throws NotFoundException if entity not found
   */
  protected async baseFindOne(
    id: string,
    agencyId?: string,
    options?: FindManyOptions<T>,
  ): Promise<T> {
    try {
      const where = this.buildWhereWithAgencyScope(id, agencyId);

      const entity = await this.repository.findOne({
        ...options,
        where,
      });

      if (!entity) {
        throw new NotFoundException(
          `${this.getEntityName()} with ID ${id} not found`,
        );
      }

      return entity;
    } catch (error) {
      ErrorHandler.handle(error, `${this.getEntityName()}Service.findOne`);
    }
  }

  /**
   * Find a single entity by custom criteria
   * @param where - The search criteria
   * @param options - Additional find options (e.g., relations)
   * @returns The found entity or null
   */
  protected async baseFindOneBy(
    where: FindOptionsWhere<T>,
    options?: FindManyOptions<T>,
  ): Promise<T | null> {
    try {
      return await this.repository.findOne({
        ...options,
        where,
      });
    } catch (error) {
      ErrorHandler.handle(error, `${this.getEntityName()}Service.findOneBy`);
    }
  }

  /**
   * Update an entity with optional agency scoping
   * @param id - The entity ID
   * @param data - The data to update
   * @param agencyId - Optional agency ID for scoping
   * @returns The updated entity
   */
  protected async baseUpdate(
    id: string,
    data: DeepPartial<T>,
    agencyId?: string,
  ): Promise<T> {
    try {
      // Verify entity exists and belongs to agency (if specified)
      await this.baseFindOne(id, agencyId);

      // Update the entity
      await this.repository.update(id, data as any);

      // Return the updated entity
      return await this.baseFindOne(id, agencyId);
    } catch (error) {
      ErrorHandler.handle(error, `${this.getEntityName()}Service.update`);
    }
  }

  /**
   * Remove an entity with optional agency scoping
   * @param id - The entity ID
   * @param agencyId - Optional agency ID for scoping
   */
  protected async baseRemove(id: string, agencyId?: string): Promise<void> {
    try {
      const entity = await this.baseFindOne(id, agencyId);
      await this.repository.remove(entity);
    } catch (error) {
      ErrorHandler.handle(error, `${this.getEntityName()}Service.remove`);
    }
  }

  /**
   * Count entities matching the given criteria
   * @param where - The search criteria
   * @returns The count of matching entities
   */
  protected async baseCount(where?: FindOptionsWhere<T>): Promise<number> {
    try {
      return await this.repository.count({ where });
    } catch (error) {
      ErrorHandler.handle(error, `${this.getEntityName()}Service.count`);
    }
  }

  /**
   * Check if an entity exists by ID
   * @param id - The entity ID
   * @returns True if entity exists, false otherwise
   */
  protected async baseExists(id: string): Promise<boolean> {
    try {
      const count = await this.repository.count({
        where: { id } as FindOptionsWhere<T>,
      });
      return count > 0;
    } catch (error) {
      ErrorHandler.handle(error, `${this.getEntityName()}Service.exists`);
    }
  }

  /**
   * Build where clause with optional agency scoping
   * @param id - The entity ID
   * @param agencyId - Optional agency ID for scoping
   * @returns Where clause object
   */
  protected buildWhereWithAgencyScope(id: string, agencyId?: string): any {
    const where: any = { id };
    if (agencyId) {
      where.agencyId = agencyId;
    }
    return where;
  }
}
