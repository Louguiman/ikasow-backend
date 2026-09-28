import { ApiProperty } from '@nestjs/swagger';

/**
 * Generic paginated response wrapper, used by every list endpoint.
 *
 * The metadata is **flat**, on the same level as `data`. It used to be nested under
 * `meta`, but the client reads `data.total` / `data.page` / `data.totalPages`
 * (see `ikasow-frontend/src/store/api/types.ts`), so every list page rendered
 * "Page 1 sur undefined" and the next/prev controls were permanently disabled.
 * Keep this shape and `PaginatedResponse` in the frontend in sync.
 */
export class PaginatedResponse<T> {
  @ApiProperty({ description: 'Array of items for the current page' })
  data: T[];

  @ApiProperty({ description: 'Total number of items', example: 100 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages: number;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  }
}
