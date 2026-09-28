import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Shared middleware stack: prefix, helmet, CORS, validation pipe, filters,
  // interceptors. Exactly what the e2e smoke test exercises.
  configureApp(app);

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('IKASOW Backend API')
    .setDescription('RESTful API for IKASOW real estate management platform')
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
