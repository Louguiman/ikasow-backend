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

/**
 * Documents are mostly PDFs, so they get their own allowlist rather than being
 * widened into the image one. `multerConfig` stays image-only: loosening it
 * would let an arbitrary user-supplied file be served from the API origin under
 * the property-image path, which `FileAccessGuard` treats as public for published
 * properties.
 */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

/** 10MB. Larger than the 5MB image cap: a scanned lease is a big PDF. */
export const MAX_DOCUMENT_FILE_SIZE = 10 * 1024 * 1024;

export const documentUploadConfig = {
  storage: diskStorage({
    destination: './uploads',
    // Same scheme as `multerConfig`: timestamp + random bytes. The extension is
    // kept from the *validated* mime type rather than the client's filename, so
    // `evil.pdf.html` cannot land with a `.html` name.
    filename: (_req: any, file: any, callback: any) => {
      const timestamp = Date.now();
      const randomString = randomBytes(16).toString('hex');
      const extension = EXTENSION_BY_MIME[file.mimetype] ?? '.bin';
      callback(null, `${timestamp}-${randomString}${extension}`);
    },
  }),
  limits: {
    fileSize: MAX_DOCUMENT_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req: any, file: any, callback: any) => {
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          `Invalid file type. Only ${ALLOWED_DOCUMENT_MIME_TYPES.join(', ')} are allowed.`,
        ),
        false,
      );
    }

    callback(null, true);
  },
};

const EXTENSION_BY_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
