import { Test, TestingModule } from '@nestjs/testing';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { UserRole } from '../users/entities/user.entity';

describe('LeadsController', () => {
  let controller: LeadsController;
  let service: LeadsService;

  const mockLeadsService = {
    create: jest.fn(),
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

  // The controller takes the agency id via @CurrentAgencyId(), which the
  // AgencyScopeGuard populates on the request — so the controller receives the
  // bare id, never the request object.
  const currentAgencyId = mockRequest.user.agencyId;

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

  describe('create', () => {
    const createDto = {
      propertyId: 'property-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      message: 'Interested in this property',
    };

    it('should create a lead for the agency on the request', async () => {
      const mockLead = { id: 'lead-1', ...createDto, agencyId: 'agency-1' };
      mockLeadsService.create.mockResolvedValue(mockLead);

      const result = await controller.create(createDto, currentAgencyId);

      expect(result).toEqual(mockLead);
      expect(mockLeadsService.create).toHaveBeenCalledWith(
        createDto,
        'agency-1',
      );
    });

    it('should take the agency from the request, not from the body', async () => {
      // CreateLeadDto has no agencyId and forbidNonWhitelisted would reject one,
      // so the only way a lead can reach another tenant is if the controller
      // stopped passing the scoped id.
      mockLeadsService.create.mockResolvedValue({ id: 'lead-1' });

      await controller.create(
        { ...createDto, agencyId: 'other-agency' } as never,
        currentAgencyId,
      );

      expect(mockLeadsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ agencyId: 'other-agency' }),
        'agency-1',
      );
    });
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

      const result = await controller.findAll({ page: 1, limit: 10 }, currentAgencyId);

      expect(result).toEqual(mockLeads);
      expect(mockLeadsService.findAll).toHaveBeenCalledWith('agency-1', 1, 10);
    });

    it('should default pagination when the query omits page and limit', async () => {
      mockLeadsService.findAll.mockResolvedValue({ data: [], total: 0 });

      await controller.findAll({}, currentAgencyId);

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

      const result = await controller.findOne('lead-1', currentAgencyId);

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

      const result = await controller.convertToClient('lead-1', currentAgencyId);

      expect(result).toEqual(mockResult);
      expect(mockLeadsService.convertToClient).toHaveBeenCalledWith('lead-1', 'agency-1');
    });
  });
});
