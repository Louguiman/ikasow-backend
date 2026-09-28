import { PaginatedResponse } from './paginated-response.dto';

/**
 * The pagination envelope is a cross-repo contract: the client reads `data.total`,
 * `data.page` and `data.totalPages` directly off the response
 * (ikasow-frontend/src/store/api/types.ts). It used to nest that metadata under
 * `meta`, which the client never read, so every list page rendered
 * "Page 1 sur undefined" with a disabled next button.
 */
describe('PaginatedResponse', () => {
  it('puts the metadata flat, on the same level as data', () => {
    const response = new PaginatedResponse([{ id: '1' }], 42, 2, 10);

    expect(response).toEqual({
      data: [{ id: '1' }],
      total: 42,
      page: 2,
      limit: 10,
      totalPages: 5,
    });
  });

  it('does not nest the metadata under meta', () => {
    // If this ever comes back, the client silently loses every page control again.
    expect(new PaginatedResponse([], 0, 1, 10)).not.toHaveProperty('meta');
  });

  it('rounds the page count up for a partial last page', () => {
    expect(new PaginatedResponse([], 11, 1, 10).totalPages).toBe(2);
    expect(new PaginatedResponse([], 10, 1, 10).totalPages).toBe(1);
    expect(new PaginatedResponse([], 1, 1, 10).totalPages).toBe(1);
  });

  it('reports no pages for an empty result', () => {
    const response = new PaginatedResponse([], 0, 1, 10);

    expect(response.totalPages).toBe(0);
    expect(response.data).toEqual([]);
  });

  it('does not produce Infinity when the limit is zero', () => {
    // Math.ceil(n / 0) is Infinity, which serialises to null in JSON and breaks the
    // pager's arithmetic.
    const response = new PaginatedResponse([], 5, 1, 0);

    expect(response.totalPages).toBe(0);
  });
});
