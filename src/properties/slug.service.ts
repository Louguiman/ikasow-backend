import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './entities/property.entity';

@Injectable()
export class SlugService {
  constructor(
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
  ) {}

  /**
   * Generates a URL-safe slug from property title and location
   * @param title - Property title
   * @param city - Property city/location
   * @param propertyId - Optional property ID to append for uniqueness
   * @returns URL-safe slug
   */
  generateSlug(title: string, city: string, propertyId?: string): string {
    // Combine title and city
    const combined = `${title} ${city}`;

    // Convert to lowercase
    let slug = combined.toLowerCase();

    // Replace special characters and accents with their ASCII equivalents
    slug = slug
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric except spaces and hyphens
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen

    // Append property ID if provided for guaranteed uniqueness
    if (propertyId) {
      // Take first 8 characters of UUID for brevity
      const shortId = propertyId.substring(0, 8);
      slug = `${slug}-${shortId}`;
    }

    return slug;
  }

  /**
   * Validates that a slug is unique within an agency
   * @param slug - The slug to validate
   * @param agencyId - The agency ID to check within
   * @param excludePropertyId - Optional property ID to exclude from check (for updates)
   * @returns true if slug is unique, false otherwise
   */
  async validateSlugUniqueness(
    slug: string,
    agencyId: string,
    excludePropertyId?: string,
  ): Promise<boolean> {
    const queryBuilder = this.propertyRepository
      .createQueryBuilder('property')
      .where('property.slug = :slug', { slug })
      .andWhere('property.agencyId = :agencyId', { agencyId });

    // Exclude current property if updating
    if (excludePropertyId) {
      queryBuilder.andWhere('property.id != :excludePropertyId', {
        excludePropertyId,
      });
    }

    const existingProperty = await queryBuilder.getOne();

    return !existingProperty; // Returns true if no existing property found (unique)
  }

  /**
   * Generates a unique slug by appending a counter if necessary
   * @param title - Property title
   * @param city - Property city/location
   * @param agencyId - Agency ID to check uniqueness within
   * @param propertyId - Property ID to append for uniqueness
   * @returns Unique URL-safe slug
   */
  async generateUniqueSlug(
    title: string,
    city: string,
    agencyId: string,
    propertyId: string,
  ): Promise<string> {
    // First try with property ID
    const baseSlug = this.generateSlug(title, city, propertyId);

    // Check if it's unique
    const isUnique = await this.validateSlugUniqueness(
      baseSlug,
      agencyId,
      propertyId,
    );

    if (isUnique) {
      return baseSlug;
    }

    // If not unique (rare case), append a timestamp
    const timestamp = Date.now();
    return `${baseSlug}-${timestamp}`;
  }
}
