import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import {
  LoggingInterceptor,
  DateFormattingInterceptor,
} from './common/interceptors';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
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
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
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

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('IMMOMALI Backend API')
    .setDescription('RESTful API for IMMOMALI real estate management platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('properties', 'Property management')
    .addTag('tenants', 'Tenant management')
    .addTag('clients', 'Client management')
    .addTag('invoices', 'Invoice management')
    .addTag('service-requests', 'Service request management')
    .addTag('mandates', 'Mandate management')
    .addTag('payments', 'Payment management')
    .addTag('activities', 'Activity tracking')
    .addTag('notifications', 'Notification management')
    .addTag('reports', 'Financial reports')
    .addTag('uploads', 'File uploads')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('app.port');
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
