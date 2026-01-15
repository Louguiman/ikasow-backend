import { Injectable, NotFoundException } from '@nestjs/common';
import { AgenciesService } from '../agencies/agencies.service';
import { UsersService } from '../users/users.service';
import { PropertiesService } from '../properties/properties.service';
import { LeadsService } from '../leads/leads.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/entities/notification.entity';
import { CreateLeadDto } from '../leads/dto/create-lead.dto';
import { Property, PropertyStatus, PropertyOperation } from '../properties/entities/property.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PublicService {
    constructor(
        private readonly agenciesService: AgenciesService,
        private readonly usersService: UsersService,
        private readonly propertiesService: PropertiesService,
        private readonly leadsService: LeadsService,
        private readonly notificationsService: NotificationsService,
        private readonly notificationsGateway: NotificationsGateway,
        @InjectRepository(Property)
        private readonly propertyRepository: Repository<Property>,
    ) { }

    async getAgencyInfo(agencyId: string) {
        const agency = await this.agenciesService.findOne(agencyId);
        if (!agency || !agency.isActive) {
            throw new NotFoundException('Agency not found or inactive');
        }
        return agency;
    }

    async getTrendingProperties(agencyId: string, limit: number = 6) {
        const [properties, total] = await this.propertyRepository.findAndCount({
            where: {
                agencyId,
                status: PropertyStatus.PUBLISHED
            },
            relations: ['images'],
            order: { createdAt: 'DESC' },
            take: limit,
        });
        return new PaginatedResponse(properties, total, 1, limit);
    }

    async getRentals(agencyId: string, page: number = 1, limit: number = 6) {
        const [properties, total] = await this.propertyRepository.findAndCount({
            where: {
                agencyId,
                status: PropertyStatus.PUBLISHED,
                operationType: PropertyOperation.RENT
            },
            relations: ['images'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return new PaginatedResponse(properties, total, page, limit);
    }

    async getSales(agencyId: string, page: number = 1, limit: number = 6) {
        const [properties, total] = await this.propertyRepository.findAndCount({
            where: {
                agencyId,
                status: PropertyStatus.PUBLISHED,
                operationType: PropertyOperation.SALE
            },
            relations: ['images'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return new PaginatedResponse(properties, total, page, limit);
    }

    async getTopCities(agencyId: string, limit: number = 4) {
        const counts = await this.propertyRepository
            .createQueryBuilder('property')
            .select('property.city', 'city')
            .addSelect('COUNT(property.id)', 'count')
            .where('property.agencyId = :agencyId', { agencyId })
            .andWhere('property.status = :status', { status: PropertyStatus.PUBLISHED })
            .groupBy('property.city')
            .orderBy('count', 'DESC')
            .limit(limit)
            .getRawMany();

        return counts.map(item => ({
            name: item.city,
            count: parseInt(item.count, 10),
            // We'll append a representative image URL on the frontend or here
            imageUrl: `https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&q=80&w=800` // Default fallback
        }));
    }

    async getAgents(agencyId: string) {
        const staff = await this.usersService.findAgencyStaff(agencyId);
        return staff
            .filter(user => user.isActive)
            .map(user => ({
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                email: user.email,
                // In a production app, we would have a 'profile' table with bio, phone, and avatar URL
            }));
    }

    async getPublicProperties(agencyId: string, page: number = 1, limit: number = 12, filters: any = {}) {
        return this.propertiesService.findAll(agencyId, page, limit, {
            ...filters,
            status: PropertyStatus.PUBLISHED
        });
    }

    async getPublicPropertyBySlug(slug: string) {
        const property = await this.propertyRepository.findOne({
            where: { slug, status: PropertyStatus.PUBLISHED },
            relations: ['images', 'agency']
        });

        if (!property) {
            throw new NotFoundException(`Property with slug ${slug} not found`);
        }

        return property;
    }

    async createLead(agencyId: string, createLeadDto: CreateLeadDto) {
        const lead = await this.leadsService.create(createLeadDto, agencyId);

        // Notify agency staff in real-time via WebSocket
        this.notificationsGateway.sendToAgency(agencyId, 'new-lead', {
            id: lead.id,
            title: 'Nouveau Lead',
            message: `Nouveau lead reçu de ${lead.firstName} ${lead.lastName}`,
            createdAt: new Date(),
        });

        // Create database notifications for all agency staff
        try {
            const staff = await this.usersService.findAgencyStaff(agencyId);
            const notificationPromises = staff
                .filter(user => user.isActive)
                .map(user => this.notificationsService.create({
                    userId: user.id,
                    title: 'Nouveau Lead',
                    message: `Un nouveau lead a été soumis par ${lead.firstName} ${lead.lastName}`,
                    type: NotificationType.GENERAL,
                }));
            await Promise.all(notificationPromises);
        } catch (err) {
            console.error('Failed to create staff notifications', err);
        }

        return lead;
    }
}
