import { Transform } from 'class-transformer';

/**
 * Decorator to sanitize string input by removing HTML tags, script tags,
 * and escaping special characters to prevent XSS attacks.
 */
export function Sanitize() {
  return Transform(({ value }) => {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value !== 'string') {
      return value;
    }

    let sanitized = value;

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
  });
}
