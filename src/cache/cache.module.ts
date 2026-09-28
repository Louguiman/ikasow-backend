import { Module, Global, OnApplicationShutdown } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import type { RedisStore } from 'cache-manager-redis-yet';
import Keyv from 'keyv';
import type { RedisClientOptions, RedisClientType } from 'redis';
import { CacheService } from './cache.service';
import { CACHE_CLIENT } from './cache.constants';

let redisClient: RedisClientType | undefined;

interface CacheConfig {
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  ttl: {
    properties: number;
    agency: number;
  };
}

/**
 * Keyv wants a `delete`/`clear` adapter (`del`/`reset` would fail its
 * validation); cache-manager v5-style stores like redis-yet speak
 * `del`. This is the shape Keyv actually calls.
 */
function toKeyvStore(store: RedisStore): KeyvStoreAdapter {
  return {
    opts: {},
    get: (key: string) => store.get(key),
    set: async (key: string, value: string, ttl?: number) => {
      await store.set(key, value, ttl);
      return true;
    },
    delete: async (key: string) => {
      await store.del(key);
      return true;
    },
    clear: () => store.reset(),
    disconnect: () => store.client.disconnect(),
  };
}

interface KeyvStoreAdapter {
  opts: object;
  namespace?: string;
  get<Value>(key: string): Promise<Value | undefined>;
  set(key: string, value: string, ttl?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  disconnect?(): Promise<void>;
}

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync<RedisClientOptions>({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const cacheConfig = configService.get<CacheConfig>('cache');

        // If cache config is not available, use in-memory cache
        if (!cacheConfig || !cacheConfig.redis) {
          console.log('ℹ️  Cache: Using in-memory cache (no Redis configuration found)');
          return { ttl: 300 * 1000 };
        }

        console.log(`🔄 Cache: Attempting to connect to Redis at ${cacheConfig.redis.host}:${cacheConfig.redis.port}...`);

        try {
          const store = await redisStore({
            socket: {
              host: cacheConfig.redis.host,
              port: cacheConfig.redis.port,
              connectTimeout: 5000,
              reconnectStrategy: (retries) => {
                if (retries > 3) {
                  console.warn('⚠️  Cache: Redis reconnection attempts exhausted, falling back to in-memory cache');
                  return false;
                }
                return Math.min(retries * 100, 3000);
              },
            },
            password: cacheConfig.redis.password,
            database: cacheConfig.redis.db,
          });

          redisClient = store.client;
          console.log(`✅ Cache: Successfully connected to Redis at ${cacheConfig.redis.host}:${cacheConfig.redis.port}`);

          const ttl = cacheConfig.ttl.properties * 1000;
          const keyv = new Keyv({
            store: toKeyvStore(store),
            // The raw client SCANs keys directly, so no `keyv:` namespace.
            useKeyPrefix: false,
            ttl,
            namespace: '',
          } as never);

          return {
            stores: [keyv],
            ttl,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn(`⚠️  Cache: Redis connection failed - ${errorMessage}`);
          console.warn('⚠️  Cache: Falling back to in-memory cache. Application will continue to work but caching will be limited to single instance.');
          console.warn('⚠️  Cache: To use Redis, ensure Redis server is running and accessible.');

          return { ttl: 300 * 1000 };
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    CacheService,
    {
      provide: CACHE_CLIENT,
      useFactory: () => redisClient,
    },
  ],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule implements OnApplicationShutdown {
  onApplicationShutdown(): void {
    if (redisClient?.isReady || redisClient?.isOpen) {
      redisClient.disconnect();
    }
    redisClient = undefined;
  }
}