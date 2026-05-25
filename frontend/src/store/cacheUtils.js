export const CACHE_TTL_MS = 60 * 1000;

export function isCacheStale(state, ttlMs = CACHE_TTL_MS) {
  if (!state.loadedAt) return true;
  return Date.now() - state.loadedAt > ttlMs;
}
