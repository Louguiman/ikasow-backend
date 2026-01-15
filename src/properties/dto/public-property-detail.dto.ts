import { PublicPropertyDto } from './public-property.dto';

export class PublicAgencyDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  website: string;
  logo: string;
}

export class PublicPropertyDetailDto extends PublicPropertyDto {
  address: string;
  postalCode: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  agency: PublicAgencyDto;
  structuredData: object;
}
