import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PublicAgencyController } from './public-agency.controller';
import { Agency } from './entities/agency.entity';
import { CacheService } from '../cache/cache.service';

describe('PublicAgencyController', () => {
  let controller: PublicAgencyController;

  const mockAgency: Agency = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Agency',
    email: 'test@agency.com',
    phone: '+1234567890',
    address: '123 Test St',
    city: 'Test City',
    postalCode: '12345',
    website: 'https://testagency.com',
    logo: 'https://example.com/logo.png',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAgencyRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicAgencyController],
      providers: [
        {
          provide: getRepositoryToken(Agency),
          useValue: mockAgencyRepository,
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            getOrSet: jest.fn((key, factory) => factory()),
            getAgencyInfoKey: jest.fn((agencyId) => `agency:info:${agencyId}`),
            getAgencyTtl: jest.fn(() => 3600000),
          },
        },
      ],
    }).compile();

    controller = module.get<PublicAgencyController>(PublicAgencyController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAgencyInfo', () => {
    it('should return agency information when agency is found', async () => {
      // Mock the private method to return an agency ID
      jest
        .spyOn(controller as any, 'extractAgencyIdFromHost')
        .mockResolvedValue(mockAgency.id);

      mockAgencyRepository.findOne.mockResolvedValue(mockAgency);

      const result = await controller.getAgencyInfo('agency.ikasow.com');

      expect(result).toEqual({
        id: mockAgency.id,
        name: mockAgency.name,
        email: mockAgency.email,
        phone: mockAgency.phone,
        address: mockAgency.address,
        city: mockAgency.city,
        postalCode: mockAgency.postalCode,
        website: mockAgency.website,
        logo: mockAgency.logo,
      });

      expect(mockAgencyRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockAgency.id, isActive: true },
      });
    });

    it('should throw NotFoundException when agencyId cannot be extracted', async () => {
      jest
        .spyOn(controller as any, 'extractAgencyIdFromHost')
        .mockResolvedValue(undefined);

      await expect(
        controller.getAgencyInfo('invalid.domain.com'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.getAgencyInfo('invalid.domain.com'),
      ).rejects.toThrow('Agency not found for this domain');
    });

    it('should throw NotFoundException when agency is not found in database', async () => {
      jest
        .spyOn(controller as any, 'extractAgencyIdFromHost')
        .mockResolvedValue(mockAgency.id);

      mockAgencyRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.getAgencyInfo('agency.ikasow.com'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.getAgencyInfo('agency.ikasow.com'),
      ).rejects.toThrow('Agency not found');
    });

    it('should not return inactive agencies', async () => {
      jest
        .spyOn(controller as any, 'extractAgencyIdFromHost')
        .mockResolvedValue(mockAgency.id);

      mockAgencyRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.getAgencyInfo('agency.ikasow.com'),
      ).rejects.toThrow(NotFoundException);

      expect(mockAgencyRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockAgency.id, isActive: true },
      });
    });

    it('should return all required agency fields', async () => {
      jest
        .spyOn(controller as any, 'extractAgencyIdFromHost')
        .mockResolvedValue(mockAgency.id);

      mockAgencyRepository.findOne.mockResolvedValue(mockAgency);

      const result = await controller.getAgencyInfo('agency.ikasow.com');

      // Verify all required fields are present
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('phone');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('city');
      expect(result).toHaveProperty('postalCode');
      expect(result).toHaveProperty('website');
      expect(result).toHaveProperty('logo');

      // Verify internal fields are not exposed
      expect(result).not.toHaveProperty('isActive');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
    });
  });
});
