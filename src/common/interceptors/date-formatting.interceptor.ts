import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor to format all Date objects in responses to ISO 8601 format
 * This ensures consistent date formatting across all API responses
 */
@Injectable()
export class DateFormattingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.formatDates(data)));
  }

  /**
   * Recursively format all Date objects in the response data
   * @param data - The response data to format
   * @returns The data with all dates formatted as ISO 8601 strings
   */
  private formatDates(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    // Handle Date objects
    if (data instanceof Date) {
      return data.toISOString();
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item) => this.formatDates(item));
    }

    // Handle objects
    if (typeof data === 'object') {
      const formatted: any = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          formatted[key] = this.formatDates(data[key]);
        }
      }
      return formatted;
    }

    // Return primitive values as-is
    return data;
  }
}
