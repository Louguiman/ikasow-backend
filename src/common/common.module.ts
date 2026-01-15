import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesController } from './controllers/files.controller';
import { FileAccessGuard } from './guards/file-access.guard';
import { PropertyImage } from '../properties/entities/property-image.entity';
import { Property } from '../properties/entities/property.entity';
import { SanitizationPipe } from './pipes/sanitization.pipe';
import { FileTypeValidationPipe } from './pipes/file-type-validation.pipe';
import { DateFormattingInterceptor } from './interceptors/date-formatting.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

/**
 * CommonModule provides shared utilities, pipes, guards, and interceptors
 * that are used across multiple feature modules.
 * 
 * This module is marked as @Global() so its exports are available
 * throughout the application without needing to import it in every module.
 * 
 * Exports:
 * - Guards: FileAccessGuard
 * - Pipes: SanitizationPipe, FileTypeValidationPipe
 * - Interceptors: DateFormattingInterceptor, LoggingInterceptor
 * - DTOs: PaginationDto, PaginatedResponse (via index exports)
 * - Services: BaseService (via index exports)
 * - Validators: Date validators (via index exports)
 * - Utils: ErrorHandler (via index exports)
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PropertyImage, Property])],
  controllers: [FilesController],
  providers: [
    FileAccessGuard,
    SanitizationPipe,
    FileTypeValidationPipe,
    DateFormattingInterceptor,
    LoggingInterceptor,
  ],
  exports: [
    FileAccessGuard,
    SanitizationPipe,
    FileTypeValidationPipe,
    DateFormattingInterceptor,
    LoggingInterceptor,
  ],
})
export class CommonModule {}
