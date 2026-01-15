import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
} from '@nestjs/common';

/**
 * Pipe to sanitize user input by removing HTML tags, script tags,
 * and escaping special characters to prevent XSS attacks.
 */
@Injectable()
export class SanitizationPipe implements PipeTransform {
  transform(value: any, _metadata: ArgumentMetadata) {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle different types of input
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (typeof value === 'object') {
      return this.sanitizeObject(value);
    }

    // Return primitive types as-is (numbers, booleans, etc.)
    return value;
  }

  /**
   * Sanitize a string by removing HTML/script tags and escaping special characters
   */
  private sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') {
      return input;
    }

    let sanitized = input;

    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove all HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Escape special characters that could be used for XSS
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    return sanitized.trim();
  }

  /**
   * Recursively sanitize all string properties in an object
   */
  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.transform(item, {} as ArgumentMetadata));
    }

    if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = this.transform(obj[key], {} as ArgumentMetadata);
        }
      }
      return sanitized;
    }

    return obj;
  }
}
