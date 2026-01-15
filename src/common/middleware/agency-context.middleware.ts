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
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    try {
      // Parse host header to extract subdomain
      const host = req.headers.host || '';
      const agencyId = await this.extractAgencyIdFromHost(host);

      if (agencyId) {
        // Attach agencyId to request context
        req.agencyId = agencyId;
        this.logger.debug(`Agency context set: ${agencyId} for host: ${host}`);
      } else {
        this.logger.debug(`No agency found for host: ${host}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error extracting agency from host: ${errorMessage}`);
      // Don't block the request if agency extraction fails
      // The controller can handle missing agency context
    }

    next();
  }

  /**
   * Extract agency ID from host header
   * Parses subdomain from host (e.g., "agency1.ikasow.com" -> "agency1")
   * and looks up agency by subdomain in database
   */
  private async extractAgencyIdFromHost(host: string): Promise<string | undefined> {
    if (!host) {
      return undefined;
    }

    // Remove port if present (e.g., "localhost:3000" -> "localhost")
    const hostWithoutPort = host.split(':')[0];

    // Split by dots to get subdomain
    const parts = hostWithoutPort.split('.');

    // If we have at least 3 parts (subdomain.domain.tld), extract subdomain
    // For localhost or single-part domains, return undefined
    if (parts.length < 2) {
      return undefined;
    }

    // Extract subdomain (first part)
    const subdomain = parts[0];

    // Skip common non-agency subdomains
    const skipSubdomains = ['www', 'api', 'admin', 'localhost'];
    if (skipSubdomains.includes(subdomain.toLowerCase())) {
      return undefined;
    }

    // Look up agency by subdomain
    try {
      const agency = await this.agencyRepository.findOne({
        where: { subdomain, isActive: true },
        select: ['id', 'subdomain'],
      });

      return agency?.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error looking up agency by subdomain: ${errorMessage}`);
      return undefined;
    }
  }
}
