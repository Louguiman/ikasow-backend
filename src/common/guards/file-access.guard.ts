import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyImage } from '../../properties/entities/property-image.entity';
import { Property } from '../../properties/entities/property.entity';
import { UserRole } from '../../users/entities/user.entity';
import { Document } from '../../documents/entities/document.entity';

@Injectable()
export class FileAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(PropertyImage)
    private propertyImageRepository: Repository<PropertyImage>,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const filename = request.params.filename;

    if (!filename) {
      throw new NotFoundException('File not found');
    }

    // A stored name can be a property image or a document, and the two have
    // opposite public rules, so the row is resolved first and the rules applied
    // to whichever it is. Resolving only property images (as this used to) meant
    // every document was a 404, so the upload route wrote a file nothing could
    // serve.
    const image = await this.propertyImageRepository.findOne({
      where: { filename },
      relations: ['property'],
    });

    if (!image) {
      const document = await this.documentRepository.findOne({ where: { filename } });

      if (document) {
        // Refused unconditionally, and *not* on the strength of `user`: this route
        // is `@Public()`, so the global `JwtAuthGuard` never runs and `req.user`
        // is always undefined here no matter what token the caller sent. Verifying
        // the token inside this guard would be a second authentication path, and
        // this guard is already the one place a mistake means a lease contract
        // leaks. Documents are served by `GET /documents/:id/file`, authenticated
        // by the normal chain.
        throw new ForbiddenException(
          'Access denied - documents are served through /documents/:id/file',
        );
      }

      throw new NotFoundException('File not found');
    }

    // If user is not authenticated, only allow access to published properties
    if (!user) {
      const property = await this.propertyRepository.findOne({
        where: { id: image.propertyId },
      });

      if (!property || property.status !== 'published') {
        throw new ForbiddenException('Access denied');
      }

      return true;
    }

    // Platform admins can access all files
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return true;
    }

    // Check if user's agency matches the property's agency
    const property = await this.propertyRepository.findOne({
      where: { id: image.propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.agencyId !== user.agencyId) {
      throw new ForbiddenException('Access denied - cross-agency access not allowed');
    }

    return true;
  }
}
