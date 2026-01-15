import { Test, TestingModule } from '@nestjs/testing';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { UserRole } from '../users/entities/user.entity';

describe('LeadsController', () => {
  let controller: LeadsController;
  let service: LeadsService;

  const mockLeadsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    convertToClient: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: 'user-1',
      agencyId: 'agency-1',
      role: UserRole.ADMIN,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [
        {
          provide: LeadsService,
          useValue: mockLeadsService,
        },
      ],
    }).compile();

    controller = module.get<LeadsController>(LeadsController);
    service = module.get<LeadsService>(LeadsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated leads for the agency', async () => {
      const mockLeads = {
        data: [
          {
            id: 'lead-1',
            agencyId: 'agency-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            message: 'Interested in property',
            propertyId: 'property-1',
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockLeadsService.findAll.mockResolvedValue(mockLeads);

      const result = await controller.findAll({ page: 1, limit: 10 }, mockRequest);

      expect(result).toEqual(mockLeads);
      expect(mockLeadsService.findAll).toHaveBeenCalledWith('agency-1', 1, 10);
    });
  });

  describe('findOne', () => {
    it('should return a single lead by id', async () => {
      const mockLead = {
        id: 'lead-1',
        agencyId: 'agency-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        message: 'Interested in property',
        propertyId: 'property-1',
        property: {
          id: 'property-1',
          title: 'Test Property',
        },
        createdAt: new Date(),
      };

      mockLeadsService.findOne.mockResolvedValue(mockLead);

      const result = await controller.findOne('lead-1', mockRequest);

      expect(result).toEqual(mockLead);
      expect(mockLeadsService.findOne).toHaveBeenCalledWith('lead-1', 'agency-1');
    });
  });

  describe('convertToClient', () => {
    it('should convert a lead to a client', async () => {
      const mockResult = {
        lead: {
          id: 'lead-1',
          agencyId: 'agency-1',
          isConverted: true,
          convertedToClientId: 'client-1',
        },
        clientId: 'client-1',
      };

      mockLeadsService.convertToClient.mockResolvedValue(mockResult);

      const result = await controller.convertToClient('lead-1', mockRequest);

      expect(result).toEqual(mockResult);
      expect(mockLeadsService.convertToClient).toHaveBeenCalledWith('lead-1', 'agency-1');
    });
  });
});
