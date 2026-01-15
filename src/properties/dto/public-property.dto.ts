import { PropertyType } from '../entities/property.entity';

export class PropertyImageDto {
  id: string;
  url: string;
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
  filename: string;
  order: number;
}

export class PublicPropertyDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: PropertyType;
  city: string;
  price: number;
  size: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  images: PropertyImageDto[];
  publishedAt: Date;
}
