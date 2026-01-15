import { ApiProperty } from '@nestjs/swagger';

/**
 * Metadata for paginated responses
 */
export class PaginationMeta {
  @ApiProperty({ description: 'Total number of items', example: 100 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages: number;
}

/**
 * Generic paginated response wrapper
 * Used to provide consistent pagination metadata across all list endpoints
 */
export class PaginatedResponse<T> {
  @ApiProperty({ description: 'Array of items for the current page' })
  data: T[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMeta })
  meta: PaginationMeta;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
