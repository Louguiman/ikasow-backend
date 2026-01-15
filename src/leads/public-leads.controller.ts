import {
  Controller,
  Post,
  Body,
  BadRequestException,
  NotFoundException,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SanitizationPipe } from '../common/pipes/sanitization.pipe';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadResponseDto } from './dto/lead-response.dto';
import { PropertiesService } from '../properties/properties.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { PropertyStatus } from '../properties/entities/property.entity';
import { NotificationType } from '../notifications/entities/notification.entity';
import { Public } from '../auth/decorators/public.decorator';

@Controller('public/leads')
@Public()
@Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 lead submissions per minute
@UsePipes(SanitizationPipe) // Apply input sanitization to prevent XSS
export class PublicLeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly propertiesService: PropertiesService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  async createLead(
    @Body() createLeadDto: CreateLeadDto,
  ): Promise<LeadResponseDto> {
    // Verify property exists
    let property;
    try {
      property = await this.propertiesService.findOne(
        createLeadDto.propertyId,
      );
    } catch (error) {
      throw new NotFoundException(
        `Property with ID ${createLeadDto.propertyId} not found`,
      );
    }

    // Verify property is published
    if (property.status !== PropertyStatus.PUBLISHED) {
      throw new BadRequestException(
        'Cannot submit lead for unpublished property',
      );
    }

    // Extract agencyId from property
    const agencyId = property.agencyId;

    // Create lead record
    const lead = await this.leadsService.create(createLeadDto, agencyId);

    // Create notification for agency staff
    const agencyStaff = await this.usersService.findAgencyStaff(agencyId);

    if (agencyStaff && agencyStaff.length > 0) {
      const notifications = agencyStaff.map((user) => ({
        userId: user.id,
        title: 'New Lead Received',
        message: `${createLeadDto.firstName} ${createLeadDto.lastName} is interested in ${property.title}`,
        type: NotificationType.GENERAL,
      }));

      await this.notificationsService.createBulk(notifications);
    }

    // Return success response
    return new LeadResponseDto(lead.id);
  }
}
