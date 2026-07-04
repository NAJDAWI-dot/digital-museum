// Thin wrapper around the CounterAPI service (https://counterapi.dev),
// shared by any component that needs a simple global counter with no backend.
// All counters live under the same `najdawi-museum` namespace, keyed by an
// arbitrary string (e.g. a project id, or "cv-downloads").

const NAMESPACE = 'najdawi-museum';

/**
 * Read the current value of a counter without changing it.
 * Resolves to `null` on any network/parsing failure so callers can
 * fall back to whatever local state they already have.
 */
export function getCount(key) {
  return fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/${key}`)
    .then(res => res.json())
    .then(data => (data && typeof data.count === 'number' ? Math.max(0, data.count) : null))
    .catch(() => null);
}

/**
 * Increment (or decrement) a counter.
 * @param {string} key - counter key under the shared namespace
 * @param {'up'|'down'} [direction='up']
 * @returns {Promise<number|null>} the new count, or null on failure
 */
export function incrementCount(key, direction = 'up') {
  return fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/${key}/${direction}`)
    .then(res => res.json())
    .then(data => (data && typeof data.count === 'number' ? Math.max(0, data.count) : null))
    .catch(() => null);
}
