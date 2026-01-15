import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import type { RedisClientOptions } from 'redis';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync<RedisClientOptions>({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const cacheConfig = configService.get('cache');
        
        // If cache config is not available, use in-memory cache
        if (!cacheConfig || !cacheConfig.redis) {
          console.log('ℹ️  Cache: Using in-memory cache (no Redis configuration found)');
          return {
            ttl: 300 * 1000, // 5 minutes default
          };
        }
        
        // Try to connect to Redis first
        console.log(`🔄 Cache: Attempting to connect to Redis at ${cacheConfig.redis.host}:${cacheConfig.redis.port}...`);
        
        try {
          const store = await redisStore({
            socket: {
              host: cacheConfig.redis.host,
              port: cacheConfig.redis.port,
              connectTimeout: 5000,
              reconnectStrategy: (retries) => {
                // Stop reconnecting after 3 attempts
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
          
          console.log(`✅ Cache: Successfully connected to Redis at ${cacheConfig.redis.host}:${cacheConfig.redis.port}`);
          
          return {
            store,
            ttl: cacheConfig.ttl.properties * 1000, // Convert to milliseconds
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn(`⚠️  Cache: Redis connection failed - ${errorMessage}`);
          console.warn('⚠️  Cache: Falling back to in-memory cache. Application will continue to work but caching will be limited to single instance.');
          console.warn('⚠️  Cache: To use Redis, ensure Redis server is running and accessible.');
          
          return {
            ttl: 300 * 1000, // 5 minutes default
          };
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {}
