import { PropertyType, PropertyOperation } from '../entities/property.entity';

export class PropertyImageDto {
  id: string;
  url: string;
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
  filename: string;
  order: number;
  /**
   * Derived from `order === 0` rather than stored. The public cards do
   * `images.find(img => img.isPrimary)`, which was always `undefined` because nothing
   * ever sent the field; they happened to land on the right image only because the
   * mapper sorts by `order` first.
   */
  isPrimary: boolean;
}

export class PublicPropertyDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: PropertyType;
  /**
   * The rentals/sales lists filter on this but never returned it, while the frontend
   * type declared it as non-optional — so any card rendering a sale/rent badge read
   * `undefined` off a value the compiler promised was there.
   */
  operationType: PropertyOperation;
  city: string;
  price: number;
  size: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  images: PropertyImageDto[];
  publishedAt: Date;
}
