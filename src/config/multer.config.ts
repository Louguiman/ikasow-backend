import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomBytes } from 'crypto';
import { BadRequestException } from '@nestjs/common';

// Allowed MIME types for image uploads
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

// Maximum file size (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (_req, file, callback) => {
      // Generate unique filename using crypto random bytes + timestamp for extra uniqueness
      const timestamp = Date.now();
      const randomString = randomBytes(16).toString('hex');
      const extension = extname(file.originalname).toLowerCase();
      const uniqueName = `${timestamp}-${randomString}${extension}`;
      callback(null, uniqueName);
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only allow one file per request
  },
  fileFilter: (_req: any, file: any, callback: any) => {
    // Validate MIME type
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          `Invalid file type. Only ${ALLOWED_IMAGE_MIME_TYPES.join(', ')} are allowed.`,
        ),
        false,
      );
    }

    // Validate file extension matches MIME type
    const extension = extname(file.originalname).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    
    if (!validExtensions.includes(extension)) {
      return callback(
        new BadRequestException(
          'Invalid file extension. Only .jpg, .jpeg, .png, and .webp are allowed.',
        ),
        false,
      );
    }

    callback(null, true);
  },
};
