import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import appConfig from './config/app.config';
import cacheConfig from './config/cache.config';
import { winstonConfig } from './config/logger.config';
import { validate } from './config/env.validation';
import { AgenciesModule } from './agencies/agencies.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PropertiesModule } from './properties/properties.module';
import { TenantsModule } from './tenants/tenants.module';
import { ClientsModule } from './clients/clients.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ServiceRequestsModule } from './service-requests/service-requests.module';
import { LeadsModule } from './leads/leads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PublicModule } from './public/public.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AgencyScopeGuard } from './auth/guards/agency-scope.guard';
import { PublicRateLimitGuard } from './common/guards/public-rate-limit.guard';
import { CacheModule } from './cache/cache.module';
import { CommonModule } from './common/common.module';
import { AuthorizationLoggingInterceptor } from './common/interceptors/authorization-logging.interceptor';
import { AgencyContextMiddleware } from './common/middleware/agency-context.middleware';
import { Agency } from './agencies/entities/agency.entity';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, appConfig, cacheConfig],
      envFilePath: '.env',
      validate, // Validate environment variables at startup
    }),
    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        if (!dbConfig) {
          throw new Error('Database configuration not found');
        }
        return dbConfig;
      },
      inject: [ConfigService],
    }),
    // Import Agency entity for middleware
    TypeOrmModule.forFeature([Agency]),
    // Logger
    WinstonModule.forRoot(winstonConfig),
    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),
    // Cache
    CacheModule,
    // Common Module (for file serving and shared utilities)
    CommonModule,
    // Feature Modules
    AuthModule,
    AgenciesModule,
    UsersModule,
    PropertiesModule,
    TenantsModule,
    ClientsModule,
    InvoicesModule,
    ServiceRequestsModule,
    LeadsModule,
    NotificationsModule,
    PublicModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AgencyScopeGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PublicRateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthorizationLoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply agency context middleware to all public routes
    consumer
      .apply(AgencyContextMiddleware)
      .forRoutes('public/*');
  }
}
