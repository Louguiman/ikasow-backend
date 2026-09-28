import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';
import { CreateLeadDto } from '../leads/dto/create-lead.dto';
import { Lead } from '../leads/entities/lead.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { PublicPropertyDto } from '../properties/dto/public-property.dto';
import {
  PublicPropertyDetailDto,
  PublicAgencyDto,
} from '../properties/dto/public-property-detail.dto';
import { PublicPropertyFiltersDto } from '../properties/dto/public-property-filters.dto';

@ApiTags('public')
@Controller('public/:agencyIdentifier')
@Public()
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('agency')
  @ApiOperation({ summary: 'Get public agency information' })
  public async getAgency(
    @CurrentAgencyId() agencyId: string,
  ): Promise<PublicAgencyDto> {
    return this.publicService.getAgencyInfo(this.requireAgency(agencyId));
  }

  @Get('properties')
  @ApiOperation({ summary: 'Get all published properties with filters' })
  public async getProperties(
    @CurrentAgencyId() agencyId: string,
    @Query() filters: PublicPropertyFiltersDto,
  ): Promise<PaginatedResponse<PublicPropertyDto>> {
    return this.publicService.getPublicProperties(
      this.requireAgency(agencyId),
      filters,
    );
  }

  @Get('properties/slug/:slug')
  @ApiOperation({ summary: 'Get property details by slug' })
  public async getPropertyBySlug(
    @CurrentAgencyId() agencyId: string,
    @Param('slug') slug: string,
  ): Promise<PublicPropertyDetailDto> {
    return this.publicService.getPublicPropertyBySlug(
      this.requireAgency(agencyId),
      slug,
    );
  }

  @Get('properties/trending')
  @ApiOperation({ summary: 'Get trending properties' })
  public async getTrending(
    @CurrentAgencyId() agencyId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<PaginatedResponse<PublicPropertyDto>> {
    return this.publicService.getTrendingProperties(
      this.requireAgency(agencyId),
      limit,
    );
  }

  @Get('properties/rentals')
  @ApiOperation({ summary: 'Get properties for rent' })
  public async getRentals(
    @CurrentAgencyId() agencyId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<PaginatedResponse<PublicPropertyDto>> {
    return this.publicService.getRentals(
      this.requireAgency(agencyId),
      page,
      limit,
    );
  }

  @Get('properties/sales')
  @ApiOperation({ summary: 'Get properties for sale' })
  public async getSales(
    @CurrentAgencyId() agencyId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<PaginatedResponse<PublicPropertyDto>> {
    return this.publicService.getSales(
      this.requireAgency(agencyId),
      page,
      limit,
    );
  }

  @Get('cities/top')
  @ApiOperation({ summary: 'Get cities with most properties' })
  public async getTopCities(
    @CurrentAgencyId() agencyId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<Array<{ name: string; count: number; imageUrl: string }>> {
    return this.publicService.getTopCities(this.requireAgency(agencyId), limit);
  }

  @Get('agents')
  @ApiOperation({ summary: 'Get public agent profiles' })
  public async getAgents(
    @CurrentAgencyId() agencyId: string,
  ): Promise<Array<Record<string, unknown>>> {
    return this.publicService.getAgents(this.requireAgency(agencyId));
  }

  @Post('leads')
  @ApiOperation({ summary: 'Create a new lead' })
  public async createLead(
    @CurrentAgencyId() agencyId: string,
    @Body() createLeadDto: CreateLeadDto,
  ): Promise<Lead> {
    return this.publicService.createLead(
      this.requireAgency(agencyId),
      createLeadDto,
    );
  }

  /**
   * The middleware resolves `:agencyIdentifier` and rejects unknown ones, so a
   * missing agency here means the context was not established. Every handler used to
   * answer with an empty page instead, which read as "this agency has nothing"
   * rather than "this portal does not exist". The middleware now throws first; this
   * is the type-level backstop.
   */
  private requireAgency(agencyId: string | undefined): string {
    if (!agencyId) {
      throw new NotFoundException('Agency context not found');
    }
    return agencyId;
  }
}
