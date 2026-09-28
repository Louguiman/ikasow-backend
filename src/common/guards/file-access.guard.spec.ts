import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileAccessGuard } from './file-access.guard';
import { PropertyImage } from '../../properties/entities/property-image.entity';
import { Property } from '../../properties/entities/property.entity';
import { Document } from '../../documents/entities/document.entity';
import { UserRole } from '../../users/entities/user.entity';

describe('FileAccessGuard', () => {
  let guard: FileAccessGuard;
  let imageRepo: Record<string, jest.Mock>;
  let propertyRepo: Record<string, jest.Mock>;
  let documentRepo: Record<string, jest.Mock>;

  const AGENCY = 'agency-1';
  const PROPERTY = 'property-1';

  const contextFor = (user?: unknown, filename = 'file.pdf') =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user, params: { filename } }),
      }),
    }) as never;

  const image = (over: Partial<PropertyImage> = {}): PropertyImage =>
    ({
      id: 'img-1',
      filename: 'file.jpg',
      propertyId: PROPERTY,
      ...over,
    }) as PropertyImage;

  const document = (over: Partial<Document> = {}): Document =>
    ({
      id: 'doc-1',
      filename: 'file.pdf',
      agencyId: AGENCY,
      ...over,
    }) as Document;

  beforeEach(async () => {
    imageRepo = { findOne: jest.fn().mockResolvedValue(null) };
    propertyRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({
          id: PROPERTY,
          agencyId: AGENCY,
          status: 'published',
        }),
    };
    documentRepo = { findOne: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileAccessGuard,
        { provide: getRepositoryToken(PropertyImage), useValue: imageRepo },
        { provide: getRepositoryToken(Property), useValue: propertyRepo },
        { provide: getRepositoryToken(Document), useValue: documentRepo },
      ],
    }).compile();

    guard = module.get<FileAccessGuard>(FileAccessGuard);
  });

  afterEach(() => jest.clearAllMocks());

  describe('property images (unchanged rules)', () => {
    it('serves a published property image to an anonymous caller', async () => {
      imageRepo.findOne.mockResolvedValue(image());
      await expect(
        guard.canActivate(contextFor(undefined, 'file.jpg')),
      ).resolves.toBe(true);
    });

    it('refuses an unpublished one anonymously', async () => {
      imageRepo.findOne.mockResolvedValue(image());
      propertyRepo.findOne.mockResolvedValue({
        id: PROPERTY,
        agencyId: AGENCY,
        status: 'rented',
      });
      await expect(
        guard.canActivate(contextFor(undefined, 'file.jpg')),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses a cross-agency user', async () => {
      imageRepo.findOne.mockResolvedValue(image());
      propertyRepo.findOne.mockResolvedValue({
        id: PROPERTY,
        agencyId: 'other',
        status: 'published',
      });
      await expect(
        guard.canActivate(
          contextFor({ role: UserRole.ADMIN, agencyId: AGENCY }, 'file.jpg'),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('documents are never served on this route', () => {
    // This route is `@Public()`, so `JwtAuthGuard` never runs and `request.user`
    // is undefined whatever token the caller sent. A guard that verified the token
    // itself would be a second authentication path, so it does not: a document is
    // refused outright, and `GET /documents/:id/file` serves it instead.
    it.each([
      ['an anonymous caller', undefined],
      ['a same-agency user', { role: UserRole.ADMIN, agencyId: AGENCY }],
      ['another agency', { role: UserRole.ADMIN, agencyId: 'other' }],
      ['a platform admin', { role: UserRole.PLATFORM_ADMIN }],
    ])('refuses %s with a 403, not a 404', async (_label, user) => {
      documentRepo.findOne.mockResolvedValue(document());
      await expect(guard.canActivate(contextFor(user))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('points at the authenticated route so the 403 is actionable', async () => {
      documentRepo.findOne.mockResolvedValue(document());
      await expect(guard.canActivate(contextFor(undefined))).rejects.toThrow(
        /documents\/\:id\/file/,
      );
    });
  });

  describe('resolution', () => {
    it('404s a name that is neither an image nor a document', async () => {
      await expect(
        guard.canActivate(
          contextFor({ role: UserRole.ADMIN, agencyId: AGENCY }),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s a request with no filename', async () => {
      await expect(
        guard.canActivate(
          contextFor({ role: UserRole.ADMIN, agencyId: AGENCY }, ''),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('prefers an image when a name is in both tables', async () => {
      // The document lookup only runs when no image matched, so a name that
      // exists twice is decided by the image rules.
      imageRepo.findOne.mockResolvedValue(image());
      documentRepo.findOne.mockResolvedValue(document());
      propertyRepo.findOne.mockResolvedValue({
        id: PROPERTY,
        agencyId: AGENCY,
        status: 'rented',
      });
      await expect(
        guard.canActivate(contextFor(undefined, 'file.jpg')),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(documentRepo.findOne).not.toHaveBeenCalled();
    });
  });
});
