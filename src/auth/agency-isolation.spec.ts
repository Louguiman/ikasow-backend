import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PropertiesService } from '../properties/properties.service';
import { ClientsService } from '../clients/clients.service';
import { Property } from '../properties/entities/property.entity';
import { PropertyImage } from '../properties/entities/property-image.entity';
import { Client } from '../clients/entities/client.entity';
import { SlugService } from '../properties/slug.service';
import { SeoService } from '../properties/seo.service';
import { ImageProcessingService } from '../properties/image-processing.service';
import { CacheService } from '../cache/cache.service';

describe('Agency Scope Isolation', () => {
  let propertiesService: PropertiesService;
  let clientsService: ClientsService;
  let propertyRepository: Repository<Property>;
  let clientRepository: Repository<Client>;

  const mockPropertyRepository = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
  };

  const mockPropertyImageRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockClientRepository = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockSlugService = {
    generateUniqueSlug: jest.fn(),
  };

  const mockSeoService = {
    validateSeoMetadataOrThrow: jest.fn(),
    generateDefaultTitle: jest.fn(),
    generateDefaultDescription: jest.fn(),
  };

  const mockTransactionManager = {
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((callback) => callback(mockTransactionManager)),
  };

  const mockCacheService = {
    invalidatePropertyDetail: jest.fn(),
    invalidatePropertyListings: jest.fn(),
    invalidatePropertyCache: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        ClientsService,
        {
          provide: getRepositoryToken(Property),
          useValue: mockPropertyRepository,
        },
        {
          provide: getRepositoryToken(PropertyImage),
          useValue: mockPropertyImageRepository,
        },
        {
          provide: getRepositoryToken(Client),
          useValue: mockClientRepository,
        },
        {
          provide: SlugService,
          useValue: mockSlugService,
        },
        {
          provide: SeoService,
          useValue: mockSeoService,
        },
        {
          provide: ImageProcessingService,
          useValue: {
            processImage: jest.fn(),
            deleteImageSizes: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    propertiesService = module.get<PropertiesService>(PropertiesService);
    clientsService = module.get<ClientsService>(ClientsService);
    propertyRepository = module.get<Repository<Property>>(
      getRepositoryToken(Property),
    );
    clientRepository = module.get<Repository<Client>>(
      getRepositoryToken(Client),
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('PropertiesService - Agency Scope', () => {
    describe('Query methods filter by agencyId', () => {
      it('should filter properties by agencyId in findAll', async () => {
        const agencyId = 'agency-1';
        const mockProperties = [
          { id: '1', title: 'Property 1', agencyId },
          { id: '2', title: 'Property 2', agencyId },
        ];

        const mockQueryBuilder = {
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([mockProperties, 2]),
        };

        mockPropertyRepository.createQueryBuilder.mockReturnValue(
          mockQueryBuilder,
        );

        await propertiesService.findAll(agencyId, 1, 20);

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'property.agencyId = :agencyId',
          { agencyId },
        );
      });

      it('should filter properties by agencyId in findOne', async () => {
        const propertyId = 'property-1';
        const agencyId = 'agency-1';
        const mockProperty = { id: propertyId, agencyId, title: 'Test Property' };

        mockPropertyRepository.findOne.mockResolvedValue(mockProperty);

        const result = await propertiesService.findOne(propertyId, agencyId);

        expect(mockPropertyRepository.findOne).toHaveBeenCalledWith({
          where: { id: propertyId, agencyId },
          relations: ['images'],
        });
        expect(result).toEqual(mockProperty);
      });

      it('should return 404 when property not found in user agency', async () => {
        const propertyId = 'property-1';
        const agencyId = 'agency-1';

        mockPropertyRepository.findOne.mockResolvedValue(null);

        await expect(
          propertiesService.findOne(propertyId, agencyId),
        ).rejects.toThrow(NotFoundException);

        expect(mockPropertyRepository.findOne).toHaveBeenCalledWith({
          where: { id: propertyId, agencyId },
          relations: ['images'],
        });
      });
    });

    describe('Update methods enforce agency scope', () => {
      it('should only update property within same agency', async () => {
        const propertyId = 'property-1';
        const agencyId = 'agency-1';
        const mockProperty = {
          id: propertyId,
          agencyId,
          title: 'Old Title',
          city: 'City',
          description: 'Description',
        };

        mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
        mockPropertyRepository.save.mockResolvedValue({
          ...mockProperty,
          title: 'New Title',
        });

        await propertiesService.update(
          propertyId,
          { title: 'New Title' },
          agencyId,
        );

        expect(mockPropertyRepository.findOne).toHaveBeenCalledWith({
          where: { id: propertyId, agencyId },
        });
      });

      it('should return 404 when trying to update property from different agency', async () => {
        const propertyId = 'property-1';
        const agencyId = 'agency-2';

        mockPropertyRepository.findOne.mockResolvedValue(null);

        await expect(
          propertiesService.update(propertyId, { title: 'New Title' }, agencyId),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('Delete methods enforce agency scope', () => {
      it('should only delete property within same agency', async () => {
        const propertyId = 'property-1';
        const agencyId = 'agency-1';
        const mockProperty = {
          id: propertyId,
          agencyId,
          title: 'Test Property',
          images: [],
        };

        mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
        mockPropertyRepository.remove.mockResolvedValue(mockProperty);

        await propertiesService.remove(propertyId, agencyId);

        expect(mockPropertyRepository.findOne).toHaveBeenCalledWith({
          where: { id: propertyId, agencyId },
          relations: ['images'],
        });
        expect(mockDataSource.transaction).toHaveBeenCalled();
        expect(mockTransactionManager.remove).toHaveBeenCalledWith(mockProperty);
      });

      it('should return 404 when trying to delete property from different agency', async () => {
        const propertyId = 'property-1';
        const agencyId = 'agency-2';

        mockPropertyRepository.findOne.mockResolvedValue(null);

        await expect(
          propertiesService.remove(propertyId, agencyId),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('ClientsService - Agency Scope', () => {
    describe('Query methods filter by agencyId', () => {
      it('should filter clients by agencyId in findAll', async () => {
        const agencyId = 'agency-1';
        const mockClients = [
          { id: '1', name: 'Client 1', agencyId },
          { id: '2', name: 'Client 2', agencyId },
        ];

        // findAll moved from findAndCount to a query builder when the status and
        // search filters were added, so this asserts the same thing the way the
        // properties test above does.
        const mockQueryBuilder = {
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([mockClients, 2]),
        };

        mockClientRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

        await clientsService.findAll(agencyId);

        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'client.agencyId = :agencyId',
          { agencyId },
        );
      });

      it('should filter clients by agencyId in findOne', async () => {
        const clientId = 'client-1';
        const agencyId = 'agency-1';
        const mockClient = { id: clientId, agencyId, name: 'Test Client' };

        mockClientRepository.findOne.mockResolvedValue(mockClient);

        const result = await clientsService.findOne(clientId, agencyId);

        expect(mockClientRepository.findOne).toHaveBeenCalledWith({
          where: { id: clientId, agencyId },
          relations: ['user'],
        });
        expect(result).toEqual(mockClient);
      });

      it('should return 404 when client not found in user agency', async () => {
        const clientId = 'client-1';
        const agencyId = 'agency-1';

        mockClientRepository.findOne.mockResolvedValue(null);

        await expect(
          clientsService.findOne(clientId, agencyId),
        ).rejects.toThrow(NotFoundException);

        expect(mockClientRepository.findOne).toHaveBeenCalledWith({
          where: { id: clientId, agencyId },
          relations: ['user'],
        });
      });
    });

    describe('Update methods enforce agency scope', () => {
      it('should only update client within same agency', async () => {
        const clientId = 'client-1';
        const agencyId = 'agency-1';
        const mockClient = {
          id: clientId,
          agencyId,
          name: 'Old Name',
          budgetMin: 1000,
          budgetMax: 2000,
        };

        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockClientRepository.save.mockResolvedValue({
          ...mockClient,
          name: 'New Name',
        });

        await clientsService.update(clientId, agencyId, { name: 'New Name' });

        expect(mockClientRepository.findOne).toHaveBeenCalledWith({
          where: { id: clientId, agencyId },
          relations: ['user'],
        });
      });

      it('should return 404 when trying to update client from different agency', async () => {
        const clientId = 'client-1';
        const agencyId = 'agency-2';

        mockClientRepository.findOne.mockResolvedValue(null);

        await expect(
          clientsService.update(clientId, agencyId, { name: 'New Name' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('Delete methods enforce agency scope', () => {
      it('should only delete client within same agency', async () => {
        const clientId = 'client-1';
        const agencyId = 'agency-1';
        const mockClient = {
          id: clientId,
          agencyId,
          name: 'Test Client',
        };

        mockClientRepository.findOne.mockResolvedValue(mockClient);
        mockClientRepository.remove.mockResolvedValue(mockClient);

        await clientsService.remove(clientId, agencyId);

        expect(mockClientRepository.findOne).toHaveBeenCalledWith({
          where: { id: clientId, agencyId },
        });
        expect(mockClientRepository.remove).toHaveBeenCalledWith(mockClient);
      });

      it('should return 404 when trying to delete client from different agency', async () => {
        const clientId = 'client-1';
        const agencyId = 'agency-2';

        mockClientRepository.findOne.mockResolvedValue(null);

        await expect(
          clientsService.remove(clientId, agencyId),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Cross-Agency Access Prevention', () => {
    it('should prevent accessing property from different agency', async () => {
      const propertyId = 'property-1';
      const userAgencyId = 'agency-1';
      const propertyAgencyId = 'agency-2';

      // Simulate property belonging to different agency
      mockPropertyRepository.findOne.mockResolvedValue(null);

      await expect(
        propertiesService.findOne(propertyId, userAgencyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent accessing client from different agency', async () => {
      const clientId = 'client-1';
      const userAgencyId = 'agency-1';
      const clientAgencyId = 'agency-2';

      // Simulate client belonging to different agency
      mockClientRepository.findOne.mockResolvedValue(null);

      await expect(
        clientsService.findOne(clientId, userAgencyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent updating property from different agency', async () => {
      const propertyId = 'property-1';
      const userAgencyId = 'agency-1';

      mockPropertyRepository.findOne.mockResolvedValue(null);

      await expect(
        propertiesService.update(propertyId, { title: 'Hacked' }, userAgencyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent deleting property from different agency', async () => {
      const propertyId = 'property-1';
      const userAgencyId = 'agency-1';

      mockPropertyRepository.findOne.mockResolvedValue(null);

      await expect(
        propertiesService.remove(propertyId, userAgencyId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
