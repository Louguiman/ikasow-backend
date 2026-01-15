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

@Injectable()
export class FileAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(PropertyImage)
    private propertyImageRepository: Repository<PropertyImage>,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const filename = request.params.filename;

    if (!filename) {
      throw new NotFoundException('File not found');
    }

    // Find the image by filename
    const image = await this.propertyImageRepository.findOne({
      where: { filename },
      relations: ['property'],
    });

    if (!image) {
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
