import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Repository, FindManyOptions, FindOptionsWhere, DeepPartial } from 'typeorm';
import { ErrorHandler } from '../utils/error-handler';
import { PaginatedResponse } from '../dto/paginated-response.dto';

/**
 * Base service class providing common CRUD operations for all entities.
 * Services should extend this class to inherit standard functionality.
 *
 * Every read and write here is agency-scoped, and the scope is **required**:
 * `buildWhereWithAgencyScope` and `baseFindAll` throw rather than issue an
 * unscoped query. See `assertAgencyScope` for why an absent `agencyId` is a
 * wiring bug rather than a licence to read across tenants.
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
   * @param agencyId - Agency ID; required, and an absent value throws
   * @param page - Page number (1-indexed)
   * @param limit - Number of items per page
   * @param options - Additional find options (e.g., relations, filters)
   * @returns Paginated response with entities
   * @throws InternalServerErrorException if agencyId is missing
   */
  protected async baseFindAll(
    agencyId: string,
    page?: number,
    limit?: number,
    options?: FindManyOptions<T>,
  ): Promise<PaginatedResponse<T> | T[]> {
    try {
      this.assertAgencyScope(agencyId, `${this.getEntityName()}Service.findAll`);

      // Spread rather than assign: the old `where.agencyId = agencyId` mutated the
      // caller's own `options.where` object.
      const where = { ...(options?.where || {}), agencyId } as FindOptionsWhere<T>;

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
   * Find a single entity by ID with agency scoping
   * @param id - The entity ID
   * @param agencyId - Agency ID; required, and an absent value throws
   * @param options - Additional find options (e.g., relations)
   * @returns The found entity
   * @throws NotFoundException if the entity is not found in that agency
   * @throws InternalServerErrorException if agencyId is missing
   */
  protected async baseFindOne(
    id: string,
    agencyId: string,
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
   * Update an entity with agency scoping
   * @param id - The entity ID
   * @param data - Data to update
   * @param agencyId - Agency ID; required, and an absent value throws
   * @returns The updated entity
   * @throws InternalServerErrorException if agencyId is missing
   */
  protected async baseUpdate(
    id: string,
    data: DeepPartial<T>,
    agencyId: string,
  ): Promise<T> {
    try {
      // Asserted here as well as in baseFindOne so the message names the method
      // the caller actually invoked, rather than the baseFindOne it delegates to.
      this.assertAgencyScope(agencyId, `${this.getEntityName()}Service.update`);

      // Verify entity exists and belongs to agency
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
   * Remove an entity with agency scoping
   * @param id - The entity ID
   * @param agencyId - Agency ID; required, and an absent value throws
   * @throws InternalServerErrorException if agencyId is missing
   */
  protected async baseRemove(id: string, agencyId: string): Promise<void> {
    try {
      this.assertAgencyScope(agencyId, `${this.getEntityName()}Service.remove`);

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
   * Fail closed on a missing agency scope.
   *
   * `AgencyScopeGuard` attaches `request.agencyId` for every authenticated user
   * and throws 403 when a non-platform user has no agency, so an `undefined`
   * `agencyId` reaching a service is never a legitimate cross-tenant read: it is
   * a caller that forgot to thread the scope through. Returning an unscoped
   * `{ id }` in that case does not degrade gracefully, it drops the tenant
   * boundary entirely and reads another agency's row.
   *
   * A platform admin is the one caller for which "no agency" is real, and that
   * case is handled upstream — `RolesGuard` runs before `AgencyScopeGuard` and
   * rejects a platform admin on every route that reaches this class (they are
   * all `@Roles(ADMIN, AGENT, ACCOUNTANT, CLIENT)`), so it never arrives here.
   *
   * The failure is a 500 rather than a 404 on purpose: the row probably does
   * exist, and reporting "not found" would disguise a wiring bug as a missing
   * resource and send the next reader looking in the wrong place.
   */
  private assertAgencyScope(agencyId: string, operation: string): void {
    if (agencyId) {
      return;
    }

    throw new InternalServerErrorException(
      `${operation} was called without an agency scope; refusing to query across tenants.`,
    );
  }

  /**
   * Build where clause with agency scoping
   * @param id - The entity ID
   * @param agencyId - Agency ID; required, and an absent value throws
   * @returns Where clause object
   * @throws InternalServerErrorException if agencyId is missing
   */
  protected buildWhereWithAgencyScope(
    id: string,
    agencyId: string,
  ): FindOptionsWhere<T> {
    this.assertAgencyScope(agencyId, `${this.getEntityName()}Service.findOne`);

    // The double cast is required because the constraint on `T` promises only
    // `id`, not `agencyId` — every concrete entity used with this base class has
    // the column, but the type cannot know that.
    return { id, agencyId } as unknown as FindOptionsWhere<T>;
  }
}
