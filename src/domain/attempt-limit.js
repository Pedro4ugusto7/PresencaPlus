export function createAttemptLimiter({ windowMs, limit }) {
  const buckets = new Map();
  return function limited(key, now) {
    const current = buckets.get(key);
    if (!current || now >= current.reset) {
      buckets.set(key, { count: 1, reset: now + windowMs });
      return false;
    }
    current.count += 1;
    return current.count > limit;
  };
}
