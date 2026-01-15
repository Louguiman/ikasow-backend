import {
  Controller,
  Get,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { Agency } from './entities/agency.entity';
import { PublicAgencyDto } from '../properties/dto/public-property-detail.dto';
import { CacheService } from '../cache/cache.service';

@ApiTags('public-agency')
@Controller('public/agency')
@Public()
@Throttle({ short: { limit: 30, ttl: 1000 } }) // 30 requests per second for agency info
export class PublicAgencyController {
  constructor(
    @InjectRepository(Agency)
    private agencyRepository: Repository<Agency>,
    private cacheService: CacheService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get agency information (public endpoint)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns agency name, logo, and contact information',
  })
  @ApiResponse({
    status: 404,
    description: 'Agency not found',
  })
  async getAgencyInfo(
    @Req() req: any,
  ): Promise<PublicAgencyDto> {
    // Use agencyId from request context (set by middleware)
    const agencyId = req.agencyId;

    if (!agencyId) {
      throw new NotFoundException('Agency not found for this domain');
    }

    // Generate cache key
    const cacheKey = this.cacheService.getAgencyInfoKey(agencyId);

    // Use cache-aside pattern with 1-hour TTL
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Fetch agency information
        const agency = await this.agencyRepository.findOne({
          where: { id: agencyId, isActive: true },
        });

        if (!agency) {
          throw new NotFoundException('Agency not found');
        }

        // Transform to DTO
        return this.toPublicAgencyDto(agency);
      },
      this.cacheService.getAgencyTtl(),
    );
  }

  /**
   * Transform Agency entity to PublicAgencyDto
   */
  private toPublicAgencyDto(agency: Agency): PublicAgencyDto {
    return {
      id: agency.id,
      name: agency.name,
      email: agency.email,
      phone: agency.phone,
      address: agency.address,
      city: agency.city,
      postalCode: agency.postalCode,
      website: agency.website,
      logo: agency.logo,
    };
  }
}
