import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PublicLeadsController } from './public-leads.controller';
import { LeadsService } from './leads.service';
import { PropertiesService } from '../properties/properties.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { PropertyStatus } from '../properties/entities/property.entity';

describe('PublicLeadsController', () => {
  let controller: PublicLeadsController;
  let leadsService: LeadsService;
  let propertiesService: PropertiesService;
  let notificationsService: NotificationsService;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicLeadsController],
      providers: [
        {
          provide: LeadsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: PropertiesService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createBulk: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findAgencyStaff: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PublicLeadsController>(PublicLeadsController);
    leadsService = module.get<LeadsService>(LeadsService);
    propertiesService = module.get<PropertiesService>(PropertiesService);
    notificationsService = module.get<NotificationsService>(
      NotificationsService,
    );
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createLead', () => {
    const createLeadDto: CreateLeadDto = {
      propertyId: 'property-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      message: 'I am interested in this property',
    };

    it('should create a lead successfully', async () => {
      const mockProperty = {
        id: 'property-123',
        agencyId: 'agency-456',
        title: 'Test Property',
        status: PropertyStatus.PUBLISHED,
      };

      const mockLead = {
        id: 'lead-789',
        ...createLeadDto,
        agencyId: 'agency-456',
        source: 'public_portal',
      };

      const mockAgencyStaff = [
        { id: 'user-1', email: 'staff1@agency.com' },
        { id: 'user-2', email: 'staff2@agency.com' },
      ];

      jest.spyOn(propertiesService, 'findOne').mockResolvedValue(mockProperty as any);
      jest.spyOn(leadsService, 'create').mockResolvedValue(mockLead as any);
      jest.spyOn(usersService, 'findAgencyStaff').mockResolvedValue(mockAgencyStaff as any);
      jest.spyOn(notificationsService, 'createBulk').mockResolvedValue([] as any);

      const result = await controller.createLead(createLeadDto);

      expect(result).toEqual({
        id: 'lead-789',
        message: 'Thank you for your interest! We will contact you soon.',
      });

      expect(propertiesService.findOne).toHaveBeenCalledWith('property-123');
      expect(leadsService.create).toHaveBeenCalledWith(createLeadDto, 'agency-456');
      expect(usersService.findAgencyStaff).toHaveBeenCalledWith('agency-456');
      expect(notificationsService.createBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 'user-1',
            title: 'New Lead Received',
            message: 'John Doe is interested in Test Property',
          }),
          expect.objectContaining({
            userId: 'user-2',
            title: 'New Lead Received',
            message: 'John Doe is interested in Test Property',
          }),
        ]),
      );
    });

    it('should throw NotFoundException when property does not exist', async () => {
      jest.spyOn(propertiesService, 'findOne').mockRejectedValue(
        new NotFoundException('Property not found'),
      );

      await expect(controller.createLead(createLeadDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.createLead(createLeadDto)).rejects.toThrow(
        'Property with ID property-123 not found',
      );
    });

    it('should throw BadRequestException when property is not published', async () => {
      const mockProperty = {
        id: 'property-123',
        agencyId: 'agency-456',
        title: 'Test Property',
        status: PropertyStatus.DRAFT,
      };

      jest.spyOn(propertiesService, 'findOne').mockResolvedValue(mockProperty as any);

      await expect(controller.createLead(createLeadDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.createLead(createLeadDto)).rejects.toThrow(
        'Cannot submit lead for unpublished property',
      );
    });

    it('should handle case when no agency staff exists', async () => {
      const mockProperty = {
        id: 'property-123',
        agencyId: 'agency-456',
        title: 'Test Property',
        status: PropertyStatus.PUBLISHED,
      };

      const mockLead = {
        id: 'lead-789',
        ...createLeadDto,
        agencyId: 'agency-456',
        source: 'public_portal',
      };

      jest.spyOn(propertiesService, 'findOne').mockResolvedValue(mockProperty as any);
      jest.spyOn(leadsService, 'create').mockResolvedValue(mockLead as any);
      jest.spyOn(usersService, 'findAgencyStaff').mockResolvedValue([]);

      const result = await controller.createLead(createLeadDto);

      expect(result).toEqual({
        id: 'lead-789',
        message: 'Thank you for your interest! We will contact you soon.',
      });

      expect(notificationsService.createBulk).not.toHaveBeenCalled();
    });
  });
});
