import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import {
  LoggingInterceptor,
  DateFormattingInterceptor,
} from './common/interceptors';

/**
 * Shared bootstrap for the real server (`main.ts`) and the e2e smoke test, so a
 * route can never be verified against a hand-built replica that forgot the
 * global prefix, the whitelisting pipe or the exception filter.
 */
// eslint-disable-next-line max-lines-per-function -- one setup block mirrors main.ts
export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);

  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Note: Static file serving removed for security
  // Files are now served through /api/files/:filename with authorization

  // Global prefix
  app.setGlobalPrefix('api');

  // Security
  app.use(helmet());

  // CORS - Configure for public portal and admin dashboard
  const corsOrigins = configService.get<string | string[]>('app.corsOrigin');
  const corsMethods = configService.get<string>('app.corsMethods');
  const corsHeaders = configService.get<string>('app.corsHeaders');

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = Array.isArray(corsOrigins)
        ? corsOrigins
        : [corsOrigins];

      // Allow wildcard patterns for subdomains (e.g., *.ikasow.com)
      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        if (!allowedOrigin) return false;
        if (allowedOrigin === '*') return true;
        if (allowedOrigin.includes('*')) {
          const pattern = allowedOrigin.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(origin);
        }
        return allowedOrigin === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: corsMethods,
    allowedHeaders: corsHeaders,
    credentials: true,
    maxAge: 86400, // 24 hours
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new DateFormattingInterceptor(),
  );
}