import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter that catches all exceptions and transforms them
 * into consistent HTTP responses with proper logging.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || exception.name;
      } else {
        message = exceptionResponse;
        error = exception.name;
      }

      // Log HTTP exceptions at warn level with request context
      this.logger.warn(
        `HTTP ${status} - ${request.method} ${request.url} - ${this.formatMessage(message)}`,
        {
          statusCode: status,
          method: request.method,
          url: request.url,
          userAgent: request.get('user-agent'),
          ip: request.ip,
          user: (request as any).user?.id || 'anonymous',
        },
      );
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;

      // Log unexpected errors at error level with full stack trace and request context
      this.logger.error(
        `Unexpected error - ${request.method} ${request.url} - ${exception.message}`,
        {
          stack: exception.stack,
          method: request.method,
          url: request.url,
          body: request.body,
          query: request.query,
          params: request.params,
          userAgent: request.get('user-agent'),
          ip: request.ip,
          user: (request as any).user?.id || 'anonymous',
        },
      );
    } else {
      // Log unknown exception types
      this.logger.error(
        `Unknown exception type - ${request.method} ${request.url}`,
        {
          exception: String(exception),
          method: request.method,
          url: request.url,
          userAgent: request.get('user-agent'),
          ip: request.ip,
          user: (request as any).user?.id || 'anonymous',
        },
      );
    }

    // Construct consistent error response
    const errorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Format message for logging (handle both string and array formats)
   */
  private formatMessage(message: string | string[]): string {
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    return message;
  }
}
