import { Controller, Get, Post, Body, Query, Param, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';
import { CreateLeadDto } from '../leads/dto/create-lead.dto';

@ApiTags('public')
@Controller('public')
@Public()
export class PublicController {
    constructor(private readonly publicService: PublicService) { }

    @Get('agency')
    @ApiOperation({ summary: 'Get public agency information' })
    async getAgency(@CurrentAgencyId() agencyId: string) {
        if (!agencyId) {
            throw new NotFoundException('Agency context not found');
        }
        return this.publicService.getAgencyInfo(agencyId);
    }

    @Get('properties')
    @ApiOperation({ summary: 'Get all published properties with filters' })
    async getProperties(
        @CurrentAgencyId() agencyId: string,
        @Query('page', new ParseIntPipe({ optional: true })) page?: number,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
        @Query() filters?: any,
    ) {
        if (!agencyId) return { data: [], total: 0 };
        return this.publicService.getPublicProperties(agencyId, page, limit, filters);
    }

    @Get('properties/slug/:slug')
    @ApiOperation({ summary: 'Get property details by slug' })
    async getPropertyBySlug(@Param('slug') slug: string) {
        return this.publicService.getPublicPropertyBySlug(slug);
    }

    @Get('properties/trending')
    @ApiOperation({ summary: 'Get trending properties' })
    async getTrending(
        @CurrentAgencyId() agencyId: string,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    ) {
        if (!agencyId) return { data: [], total: 0 };
        return this.publicService.getTrendingProperties(agencyId, limit);
    }
    // ... rentals, sales, cities, agents ...
    @Get('properties/rentals')
    @ApiOperation({ summary: 'Get properties for rent' })
    async getRentals(
        @CurrentAgencyId() agencyId: string,
        @Query('page', new ParseIntPipe({ optional: true })) page?: number,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    ) {
        if (!agencyId) return { data: [], total: 0 };
        return this.publicService.getRentals(agencyId, page, limit);
    }

    @Get('properties/sales')
    @ApiOperation({ summary: 'Get properties for sale' })
    async getSales(
        @CurrentAgencyId() agencyId: string,
        @Query('page', new ParseIntPipe({ optional: true })) page?: number,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    ) {
        if (!agencyId) return { data: [], total: 0 };
        return this.publicService.getSales(agencyId, page, limit);
    }

    @Get('cities/top')
    @ApiOperation({ summary: 'Get cities with most properties' })
    async getTopCities(
        @CurrentAgencyId() agencyId: string,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    ) {
        if (!agencyId) return [];
        return this.publicService.getTopCities(agencyId, limit);
    }

    @Get('agents')
    @ApiOperation({ summary: 'Get public agent profiles' })
    async getAgents(@CurrentAgencyId() agencyId: string) {
        if (!agencyId) return [];
        return this.publicService.getAgents(agencyId);
    }

    @Post('leads')
    @ApiOperation({ summary: 'Create a new lead' })
    async createLead(
        @CurrentAgencyId() agencyId: string,
        @Body() createLeadDto: CreateLeadDto,
    ) {
        if (!agencyId) {
            throw new NotFoundException('Agency context not found');
        }
        return this.publicService.createLead(agencyId, createLeadDto);
    }
}
