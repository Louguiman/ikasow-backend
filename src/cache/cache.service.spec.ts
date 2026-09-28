import { CacheService } from './cache.service';
import { ConfigService } from '@nestjs/config';

/**
 * `delPattern` is the one place the cache talks Redis directly (to invalidate
 * `properties:list:*` families). It takes the raw redis client the module
 * injects (cache-manager v7 hides it behind Keyv, so the old `stores[0].client`
 * digging silently matched nothing) and iterates with SCAN, never the blocking
 * `KEYS` command.
 */
describe('CacheService', () => {
  const noConfig = { get: jest.fn().mockReturnValue(undefined) };

  const build = (redisClient?: unknown) => {
    const cacheManager = { del: jest.fn().mockResolvedValue(undefined) };
    const service = new CacheService(
      cacheManager as never,
      noConfig as unknown as ConfigService,
      redisClient as never,
    );
    return { service, del: cacheManager.del };
  };

  it('deletes keys found by a SCAN iterator on the redis client', async () => {
    async function* scan() {
      yield 'properties:list:a:1';
      yield 'properties:list:a:2';
    }

    const { service, del } = build({ scanIterator: jest.fn().mockReturnValue(scan()) });

    await service.delPattern('properties:list:a:*');

    expect(del).toHaveBeenCalledWith('properties:list:a:1');
    expect(del).toHaveBeenCalledWith('properties:list:a:2');
  });

  it('is a no-op when no redis client is available (in-memory fallback)', async () => {
    const { service, del } = build(undefined);

    await service.delPattern('x:*');

    expect(del).not.toHaveBeenCalled();
  });

  it('does not call del when a scan yields nothing', async () => {
    const { service, del } = build({
      scanIterator: jest.fn().mockReturnValue((async function* () {})()),
    });

    await service.delPattern('x:*');

    expect(del).not.toHaveBeenCalled();
  });
});