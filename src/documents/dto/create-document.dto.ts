import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '../entities/document.entity';

/**
 * The file itself is not a field: it arrives through
 * `FileInterceptor('file', documentUploadConfig)` and
 * `Express.Multer.File`, so it is not JSON and cannot be whitelisted here.
 *
 * The four relation ids are each optional and each checked against the caller's
 * agency in `DocumentsService`, which is why none of them is a polymorphic pair:
 * with a real FK the check is one `where` and a wrong agency writes no row.
 */
export class CreateDocumentDto {
  @ApiPropertyOptional({
    description:
      'Ignored when present: the controller always overwrites it with the ' +
      "caller's agency from the request context.",
  })
  @IsOptional()
  @IsUUID()
  agencyId?: string;

  @ApiProperty({ example: 'Contrat de bail - Dubarry' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Signé le 2026-01-04, deux exemplaires.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    enum: DocumentType,
    default: DocumentType.OTHER,
    description:
      'ASCII values, not the French labels the old Supabase client stored.',
  })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiPropertyOptional({ description: 'Link to a property of this agency' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Link to a tenant of this agency' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Link to a client of this agency' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Link to an invoice of this agency' })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;
}
