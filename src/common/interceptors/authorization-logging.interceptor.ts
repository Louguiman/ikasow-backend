import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Interceptor to log all authorization failures (401 and 403 errors)
 * with detailed context for security auditing and monitoring
 */
@Injectable()
export class AuthorizationLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuthorizationLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, params, query } = request;

    return next.handle().pipe(
      catchError((error) => {
        // Log 401 Unauthorized errors
        if (error instanceof UnauthorizedException) {
          this.logger.warn(
            JSON.stringify({
              type: 'UNAUTHORIZED',
              statusCode: 401,
              userId: user?.id || null,
              userRole: user?.role || null,
              agencyId: user?.agencyId || null,
              method,
              url,
              timestamp: new Date().toISOString(),
              message: error.message,
              ip: request.ip,
              userAgent: request.headers['user-agent'],
            }),
          );
        }

        // Log 403 Forbidden errors
        if (error instanceof ForbiddenException) {
          this.logger.warn(
            JSON.stringify({
              type: 'FORBIDDEN',
              statusCode: 403,
              userId: user?.id || null,
              userRole: user?.role || null,
              agencyId: user?.agencyId || null,
              method,
              url,
              params,
              query,
              timestamp: new Date().toISOString(),
              message: error.message,
              ip: request.ip,
              userAgent: request.headers['user-agent'],
              // Include body for create/update operations (excluding sensitive data)
              ...(method !== 'GET' && {
                bodyKeys: body ? Object.keys(body) : [],
              }),
            }),
          );
        }

        return throwError(() => error);
      }),
    );
  }
}
