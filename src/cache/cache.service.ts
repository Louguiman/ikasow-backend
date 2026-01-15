import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheService {
  private readonly propertiesTtl: number;
  private readonly agencyTtl: number;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {
    const cacheConfig = this.configService.get('cache');
    
    // Handle case where cache config is not available (e.g., in tests)
    if (!cacheConfig || !cacheConfig.ttl) {
      this.propertiesTtl = 300 * 1000; // 5 minutes default
      this.agencyTtl = 3600 * 1000; // 1 hour default
    } else {
      this.propertiesTtl = cacheConfig.ttl.properties * 1000; // Convert to milliseconds
      this.agencyTtl = cacheConfig.ttl.agency * 1000; // Convert to milliseconds
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    return await this.cacheManager.get<T>(key);
  }

  /**
   * Set value in cache with custom TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    const stores = (this.cacheManager as any).stores;
    if (stores && stores[0]) {
      const store = stores[0] as any;
      if (store.client && typeof store.client.keys === 'function') {
        const keys = await store.client.keys(pattern);
        if (keys && keys.length > 0) {
          await Promise.all(keys.map((key: string) => this.cacheManager.del(key)));
        }
      }
    }
  }

  /**
   * Cache-aside pattern: Get from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    // Execute factory function
    const value = await factory();

    // Store in cache
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Generate cache key for property listings
   */
  getPropertyListingKey(agencyId: string | undefined, filters: any): string {
    const filterStr = JSON.stringify(filters);
    return `properties:list:${agencyId || 'all'}:${filterStr}`;
  }

  /**
   * Generate cache key for property detail
   */
  getPropertyDetailKey(slug: string, agencyId: string | undefined): string {
    return `properties:detail:${agencyId || 'all'}:${slug}`;
  }

  /**
   * Generate cache key for agency info
   */
  getAgencyInfoKey(agencyId: string): string {
    return `agency:info:${agencyId}`;
  }

  /**
   * Invalidate all property listing caches for an agency
   */
  async invalidatePropertyListings(agencyId: string): Promise<void> {
    await this.delPattern(`properties:list:${agencyId}:*`);
    await this.delPattern(`properties:list:all:*`);
  }

  /**
   * Invalidate property detail cache
   */
  async invalidatePropertyDetail(slug: string, agencyId: string): Promise<void> {
    await this.del(this.getPropertyDetailKey(slug, agencyId));
    await this.del(this.getPropertyDetailKey(slug, undefined));
  }

  /**
   * Invalidate agency info cache
   */
  async invalidateAgencyInfo(agencyId: string): Promise<void> {
    await this.del(this.getAgencyInfoKey(agencyId));
  }

  /**
   * Get properties TTL
   */
  getPropertiesTtl(): number {
    return this.propertiesTtl;
  }

  /**
   * Get agency TTL
   */
  getAgencyTtl(): number {
    return this.agencyTtl;
  }
}
