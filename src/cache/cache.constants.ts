/**
 * The raw redis client, injected into `CacheService` so `delPattern` can SCAN
 * keys. cache-manager v7 wraps every store in a Keyv instance and never
 * exposes the client through the `Cache` API.
 */
export const CACHE_CLIENT = Symbol('CACHE_CLIENT');