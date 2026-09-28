import {
  Injectable,
  NestMiddleware,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agency } from '../../agencies/entities/agency.entity';

// Extend Express Request to include agencyId
declare global {
  namespace Express {
    interface Request {
      agencyId?: string;
      agency?: Agency;
    }
  }
}

@Injectable()
export class AgencyContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AgencyContextMiddleware.name);

  constructor(
    @InjectRepository(Agency)
    private readonly agencyRepository: Repository<Agency>,
  ) {}

  /**
   * Resolves the agency from `:agencyIdentifier` and fails closed.
   *
   * This used to log "no agency found" and call `next()` anyway, so an unresolvable
   * identifier produced a 200 with an empty list — indistinguishable from a real
   * agency with no listings. Worse, handlers that treated the agency as an optional
   * filter (`if (agencyId) andWhere(...)`) dropped the predicate entirely and served
   * every agency's rows. An unknown identifier is a 404 now, and the agency predicate
   * is unconditional in the queries that use it.
   */
  async use(req: Request, _res: Response, next: NextFunction) {
    const identifier = this.extractIdentifierFromPath(req.originalUrl);
    if (!identifier) {
      // Bound to `public/*`, so this is `/api/public/` with no identifier at all.
      // There is no route for it, but failing closed costs nothing and keeps the
      // invariant "every public request has a resolved agency" true.
      throw new NotFoundException('Agency identifier is required');
    }

    try {
      const agencyId = await this.resolveAgencyId(identifier);
      if (!agencyId) {
        this.logger.debug(`No agency found for identifier: ${identifier}`);
        throw new NotFoundException(`Agency '${identifier}' not found`);
      }
      req.agencyId = agencyId;
      this.logger.debug(
        `Agency context set: ${agencyId} for identifier: ${identifier}`,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // A database failure must not be reported as "no such agency": that would tell
      // a caller the portal does not exist when the real problem is our own outage.
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error resolving agency context: ${errorMessage}`);
      throw error;
    }

    next();
  }

  private extractIdentifierFromPath(url: string): string | undefined {
    // Expected format: /api/public/:identifier/... or /public/:identifier/...
    // The identifier may itself be a UUID, so match a single path segment only —
    // a greedy match used to swallow the rest of the path.
    const match = url.match(/\/public\/([^/]+)/);
    return match ? match[1] : undefined;
  }

  private async resolveAgencyId(
    identifier: string,
  ): Promise<string | undefined> {
    // 1. Direct UUID lookup
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier,
      );
    if (isUuid) {
      const agency = await this.agencyRepository.findOne({
        where: { id: identifier, isActive: true },
        select: ['id'],
      });
      if (agency) {
        return agency.id;
      }
    }

    // 2. Subdomain lookup. There is no fallback: an unknown identifier is a 404, so
    // that a typo or a retired subdomain can never resolve to somebody else's portal.
    const agencyBySlug = await this.agencyRepository.findOne({
      where: { subdomain: identifier.toLowerCase(), isActive: true },
      select: ['id'],
    });
    return agencyBySlug?.id;
  }
}
