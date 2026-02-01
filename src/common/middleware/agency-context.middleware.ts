import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
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
    private agencyRepository: Repository<Agency>,
  ) { }

  async use(req: Request, _res: Response, next: NextFunction) {
    try {
      const identifier = this.extractIdentifierFromPath(req.originalUrl);
      const agencyId = await this.resolveAgencyId(identifier);

      if (agencyId) {
        req.agencyId = agencyId;
        this.logger.debug(`Agency context set: ${agencyId} for identifier: ${identifier}`);
      } else {
        this.logger.debug(`No agency found for identifier: ${identifier}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error resolving agency context: ${errorMessage}`);
    }

    next();
  }

  private extractIdentifierFromPath(url: string): string | undefined {
    // Expected format: /api/public/:identifier/... or /public/:identifier/...
    const match = url.match(/\/public\/([^\/]+)/);
    return match ? match[1] : undefined;
  }

  private async resolveAgencyId(identifier: string | undefined): Promise<string | undefined> {
    if (!identifier) return undefined;

    try {
      // 1. Check if identifier is a UUID (Direct ID lookup)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      if (isUuid) {
        const agency = await this.agencyRepository.findOne({ where: { id: identifier, isActive: true }, select: ['id'] });
        if (agency) return agency.id;
      }

      // 2. Check as Subdomain/Slug
      const agencyBySlug = await this.agencyRepository.findOne({
        where: { subdomain: identifier, isActive: true },
        select: ['id'],
      });
      if (agencyBySlug) return agencyBySlug.id;

      // 3. Fallback: 'demo' if request was for 'demo' specifically (handled above) 
      // OR if we want to allow a specific fallback logic.
      // Current requirement: "for the agency it should just be a path".
      // So if path is provided but invalid, we probably return undefined (404).
      // However, if the user still wants the 'demo' fallback for dev convenience when accessing root or invalid paths:

      if (identifier === 'demo') {
        // Explicit 'demo' check already covered by slug lookup
      }

      return undefined;

    } catch (error) {
      this.logger.error(`Error resolving agency ID: ${error}`);
      return undefined;
    }
  }
}
