import { Injectable, BadRequestException } from '@nestjs/common';
import { Property, PropertyType } from './entities/property.entity';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

@Injectable()
export class SeoService {
  /**
   * Generates a default SEO title from property information
   * Format: "{PropertyType} for {Sale/Rent} in {City} - {Price}"
   * @param property - Property entity
   * @returns Default SEO title (30-60 characters)
   */
  generateDefaultTitle(property: Property): string {
    const typeLabel = this.getPropertyTypeLabel(property.type);
    const priceFormatted = this.formatPrice(property.price);

    // Create title: "Apartment for Sale in Paris - €250,000"
    let title = `${typeLabel} in ${property.city} - ${priceFormatted}`;

    // Ensure title is within SEO best practices (30-60 characters)
    if (title.length > 60) {
      // Truncate and add ellipsis
      title = title.substring(0, 57) + '...';
    }

    // Ensure minimum length
    if (title.length < 30) {
      // Add property title if too short
      const withTitle = `${property.title} - ${title}`;
      if (withTitle.length <= 60) {
        title = withTitle;
      }
    }

    return title;
  }

  /**
   * Generates a default SEO description from property information
   * @param property - Property entity
   * @returns Default SEO description (120-160 characters)
   */
  generateDefaultDescription(property: Property): string {
    const typeLabel = this.getPropertyTypeLabel(property.type);
    const priceFormatted = this.formatPrice(property.price);

    // Extract first sentence or first 100 chars of description
    let descriptionSnippet = property.description;
    if (descriptionSnippet.length > 100) {
      const firstSentence = descriptionSnippet.match(/^[^.!?]+[.!?]/);
      if (firstSentence && firstSentence[0].length <= 100) {
        descriptionSnippet = firstSentence[0];
      } else {
        descriptionSnippet = descriptionSnippet.substring(0, 97) + '...';
      }
    }

    // Build description with key details
    const details = `${property.rooms} rooms, ${property.size}m²`;
    let description = `${typeLabel} in ${property.city}. ${details}. ${priceFormatted}. ${descriptionSnippet}`;

    // Ensure description is within SEO best practices (120-160 characters)
    if (description.length > 160) {
      description = description.substring(0, 157) + '...';
    }

    // Ensure minimum length
    if (description.length < 120) {
      // Pad with more property details if available
      if (property.bedrooms && property.bathrooms) {
        const extraDetails = ` ${property.bedrooms} bedrooms, ${property.bathrooms} bathrooms.`;
        const withExtra = description + extraDetails;
        if (withExtra.length <= 160) {
          description = withExtra;
        }
      }
    }

    return description;
  }

  /**
   * Generates structured data (JSON-LD) for real estate listing
   * @param property - Property entity with agency information
   * @returns JSON-LD structured data object
   */
  generateStructuredData(property: Property & { agency?: any }): object {
    const structuredData: any = {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: property.title,
      description: property.description,
      url: property.slug ? `/properties/${property.slug}` : undefined,
      price: {
        '@type': 'PriceSpecification',
        price: property.price,
        priceCurrency: 'EUR',
      },
      address: {
        '@type': 'PostalAddress',
        streetAddress: property.address,
        addressLocality: property.city,
        postalCode: property.postalCode,
      },
      floorSize: {
        '@type': 'QuantitativeValue',
        value: property.size,
        unitCode: 'MTK', // Square meters
      },
      numberOfRooms: property.rooms,
      numberOfBedrooms: property.bedrooms,
      numberOfBathroomsTotal: property.bathrooms,
    };

    // Add images if available
    if (property.images && property.images.length > 0) {
      structuredData.image = property.images.map((img) => img.url);
    }

    // Add agency information if available
    if (property.agency) {
      structuredData.provider = {
        '@type': 'RealEstateAgent',
        name: property.agency.name,
        telephone: property.agency.phone,
        email: property.agency.email,
      };
    }

    // Add date published if available
    if (property.publishedAt) {
      structuredData.datePosted = property.publishedAt.toISOString();
    }

    return structuredData;
  }

  /**
   * Validates SEO metadata for length requirements
   * @param seoTitle - SEO title to validate
   * @param seoDescription - SEO description to validate
   * @returns Validation result with errors if any
   */
  validateSeoMetadata(
    seoTitle?: string,
    seoDescription?: string,
  ): ValidationResult {
    const errors: string[] = [];

    // Validate SEO title
    if (seoTitle) {
      if (seoTitle.length < 30) {
        errors.push('SEO title must be at least 30 characters long');
      }
      if (seoTitle.length > 60) {
        errors.push('SEO title must not exceed 60 characters');
      }
    }

    // Validate SEO description
    if (seoDescription) {
      if (seoDescription.length < 120) {
        errors.push('SEO description must be at least 120 characters long');
      }
      if (seoDescription.length > 160) {
        errors.push('SEO description must not exceed 160 characters');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates and throws exception if SEO metadata is invalid
   * @param seoTitle - SEO title to validate
   * @param seoDescription - SEO description to validate
   * @throws BadRequestException if validation fails
   */
  validateSeoMetadataOrThrow(
    seoTitle?: string,
    seoDescription?: string,
  ): void {
    const validation = this.validateSeoMetadata(seoTitle, seoDescription);

    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'SEO metadata validation failed',
        errors: validation.errors,
      });
    }
  }

  /**
   * Helper method to get human-readable property type label
   */
  private getPropertyTypeLabel(type: PropertyType): string {
    const labels: Record<string, string> = {
      [PropertyType.APARTMENT]: 'Apartment',
      [PropertyType.HOUSE]: 'House',
      [PropertyType.COMMERCIAL]: 'Commercial Property',
      [PropertyType.LAND]: 'Land',
    };
    return labels[type] || 'Property';
  }

  /**
   * Helper method to format price with currency
   */
  private formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  }
}
