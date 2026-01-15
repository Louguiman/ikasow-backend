import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate limiting guard for public endpoints
 * Extends ThrottlerGuard to provide custom rate limiting for public API
 */
@Injectable()
export class PublicRateLimitGuard extends ThrottlerGuard {
  protected override errorMessage = 'Too many requests. Please try again later.';
}
