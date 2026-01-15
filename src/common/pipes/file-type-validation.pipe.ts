import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ALLOWED_IMAGE_MIME_TYPES } from '../../config/multer.config';

@Injectable()
export class FileTypeValidationPipe implements PipeTransform {
  private readonly allowedMimeTypes: string[];

  constructor() {
    this.allowedMimeTypes = ALLOWED_IMAGE_MIME_TYPES;
  }

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type '${file.mimetype}'. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    // Validate file size (additional check beyond multer)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size ${file.size} bytes exceeds maximum allowed size of ${maxSize} bytes (5MB)`,
      );
    }

    return file;
  }
}
