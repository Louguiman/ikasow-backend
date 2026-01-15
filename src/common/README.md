# Common Module

## Overview

The Common Module provides shared utilities, DTOs, pipes, guards, interceptors, and services that are used across multiple feature modules in the IKASOW backend application.

This module is marked as `@Global()`, making its exports available throughout the application without needing to import the module in every feature module.

## Structure

```
common/
├── controllers/       # Shared controllers (e.g., file serving)
├── decorators/        # Custom decorators
├── dto/              # Common DTOs (pagination, responses)
├── filters/          # Exception filters
├── guards/           # Authorization guards
├── interceptors/     # Request/response interceptors
├── pipes/            # Validation and transformation pipes
├── services/         # Base services and utilities
├── utils/            # Utility functions
├── validators/       # Custom validators
├── common.module.ts  # Module definition
├── index.ts          # Public API exports
└── README.md         # This file
```

## Exports

### DTOs

#### PaginationDto
Standard pagination parameters for list endpoints.

```typescript
import { PaginationDto } from '@/common';

class GetPropertiesDto extends PaginationDto {
  // Additional filters...
}
```

**Properties:**
- `page?: number` - Page number (default: 1, min: 1)
- `limit?: number` - Items per page (default: 20, min: 1, max: 100)

#### PaginatedResponse<T>
Standard response format for paginated lists.

```typescript
import { PaginatedResponse } from '@/common';

async findAll(): Promise<PaginatedResponse<Property>> {
  // Implementation...
}
```

**Properties:**
- `data: T[]` - Array of items
- `meta.total: number` - Total count of items
- `meta.page: number` - Current page
- `meta.limit: number` - Items per page
- `meta.totalPages: number` - Total number of pages

### Pipes

#### SanitizationPipe
Sanitizes user input to prevent XSS attacks.

```typescript
import { SanitizationPipe } from '@/common';

@Get('search')
search(@Query('q', SanitizationPipe) query: string) {
  // query is sanitized
}
```

**Features:**
- Removes HTML tags
- Escapes special characters
- Trims whitespace

#### FileTypeValidationPipe
Validates uploaded file types.

```typescript
import { FileTypeValidationPipe } from '@/common';

@Post('upload')
@UseInterceptors(FileInterceptor('file'))
upload(@UploadedFile(FileTypeValidationPipe) file: Express.Multer.File) {
  // file type is validated
}
```

**Allowed Types:**
- Images: jpg, jpeg, png, gif, webp
- Documents: pdf

### Guards

#### FileAccessGuard
Ensures users can only access files they own or have permission to view.

```typescript
import { FileAccessGuard } from '@/common';

@Get('files/:filename')
@UseGuards(FileAccessGuard)
getFile(@Param('filename') filename: string) {
  // Access is authorized
}
```

### Interceptors

#### DateFormattingInterceptor
Formats all date fields in responses to ISO 8601 format.

```typescript
import { DateFormattingInterceptor } from '@/common';

@UseInterceptors(DateFormattingInterceptor)
@Get()
findAll() {
  // All dates in response will be ISO 8601 formatted
}
```

#### LoggingInterceptor
Logs all incoming requests and outgoing responses.

```typescript
import { LoggingInterceptor } from '@/common';

@UseInterceptors(LoggingInterceptor)
@Controller('properties')
export class PropertiesController {
  // All requests/responses are logged
}
```

### Services

#### BaseService<T>
Abstract base class for common CRUD operations.

```typescript
import { BaseService } from '@/common';

@Injectable()
export class PropertiesService extends BaseService<Property> {
  constructor(
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
  ) {
    super(propertyRepository);
  }

  protected getEntityName(): string {
    return 'Property';
  }

  // Add custom methods...
}
```

**Provided Methods:**
- `findAll(options?: FindManyOptions<T>): Promise<T[]>`
- `findOne(id: string): Promise<T>`
- `create(data: DeepPartial<T>): Promise<T>`
- `update(id: string, data: DeepPartial<T>): Promise<T>`
- `remove(id: string): Promise<void>`

### Validators

#### Date Validators
Custom validators for date fields.

```typescript
import { IsDateBefore, IsDateAfter } from '@/common';

export class CreateLeaseDto {
  @IsDateBefore('endDate')
  startDate: Date;

  @IsDateAfter('startDate')
  endDate: Date;
}
```

**Available Validators:**
- `@IsDateBefore(property: string)` - Validates date is before another date field
- `@IsDateAfter(property: string)` - Validates date is after another date field

### Utils

#### ErrorHandler
Centralized error handling utility.

```typescript
import { ErrorHandler } from '@/common';

try {
  // Database operation
} catch (error) {
  ErrorHandler.handle(error, 'PropertiesService.create');
}
```

**Features:**
- Transforms database errors to HTTP exceptions
- Handles unique constraint violations (409 Conflict)
- Handles foreign key violations (400 Bad Request)
- Logs unexpected errors
- Returns consistent error responses

### Decorators

#### @Sanitize()
Decorator to automatically sanitize method parameters.

```typescript
import { Sanitize } from '@/common';

@Get('search')
search(@Query('q') @Sanitize() query: string) {
  // query is automatically sanitized
}
```

### Filters

#### AllExceptionsFilter
Global exception filter for consistent error responses.

```typescript
import { AllExceptionsFilter } from '@/common';

// Applied globally in main.ts
app.useGlobalFilters(new AllExceptionsFilter());
```

## Usage Examples

### Creating a New Service

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '@/common';
import { MyEntity } from './entities/my-entity.entity';

@Injectable()
export class MyService extends BaseService<MyEntity> {
  constructor(
    @InjectRepository(MyEntity)
    private myRepository: Repository<MyEntity>,
  ) {
    super(myRepository);
  }

  protected getEntityName(): string {
    return 'MyEntity';
  }

  // Add custom business logic methods
  async customMethod(): Promise<MyEntity[]> {
    return this.myRepository.find({ where: { /* ... */ } });
  }
}
```

### Creating a Paginated Endpoint

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { PaginationDto, PaginatedResponse } from '@/common';
import { Property } from './entities/property.entity';
import { PropertiesService } from './properties.service';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<Property>> {
    return this.propertiesService.findAllPaginated(paginationDto);
  }
}
```

### Using Validators

```typescript
import { IsString, IsNotEmpty } from 'class-validator';
import { IsDateBefore, IsDateAfter } from '@/common';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateBefore('endDate')
  startDate: Date;

  @IsDateAfter('startDate')
  endDate: Date;
}
```

## Best Practices

### 1. Use BaseService for Standard CRUD
Extend `BaseService` for entities that need standard CRUD operations to avoid code duplication.

### 2. Use PaginationDto for List Endpoints
Always use `PaginationDto` for list endpoints to ensure consistent pagination across the API.

### 3. Use ErrorHandler for Error Handling
Use `ErrorHandler.handle()` in service methods to ensure consistent error responses.

### 4. Sanitize User Input
Use `SanitizationPipe` or `@Sanitize()` decorator for all user-provided text inputs.

### 5. Validate File Uploads
Always use `FileTypeValidationPipe` for file upload endpoints.

### 6. Use Date Validators
Use `@IsDateBefore()` and `@IsDateAfter()` for date range validation.

## Adding New Shared Utilities

When adding new shared utilities to the common module:

1. **Create the utility** in the appropriate subdirectory
2. **Export it** from the subdirectory's `index.ts` file
3. **Add it to** `common/index.ts` for public API access
4. **Update CommonModule** if it needs to be a provider
5. **Document it** in this README

## Testing

Common utilities should have comprehensive unit tests:

```typescript
// Example: sanitization.pipe.spec.ts
describe('SanitizationPipe', () => {
  let pipe: SanitizationPipe;

  beforeEach(() => {
    pipe = new SanitizationPipe();
  });

  it('should remove HTML tags', () => {
    const result = pipe.transform('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
  });
});
```

## Dependencies

The Common Module has minimal external dependencies:
- `@nestjs/common` - Core NestJS functionality
- `@nestjs/typeorm` - For BaseService and file access
- `class-validator` - For custom validators
- `class-transformer` - For DTO transformations

## Maintenance

### Regular Reviews
- Review exports quarterly to ensure only necessary items are exposed
- Check for unused utilities and remove them
- Update documentation when adding new utilities

### Breaking Changes
When making breaking changes to common utilities:
1. Document the change in CHANGELOG
2. Update all usages across the codebase
3. Update this README
4. Consider deprecation period for major changes

## Support

For questions or issues with common utilities, contact the backend team or create an issue in the project repository.
