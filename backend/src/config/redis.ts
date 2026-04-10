import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let redis: Redis | null = null;

function createRedis(): Redis | null {
  // Skip Redis in development if no URL configured
  if (!env.REDIS_URL || env.REDIS_URL === 'redis://localhost:6379') {
    if (env.NODE_ENV === 'development') {
      logger.warn('Redis not configured - running without cache (dev mode)');
      return null;
    }
  }

  const instance = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null; // Stop retrying
      return Math.min(times * 50, 2000);
    },
  });

  instance.on('connect', () => logger.info('Redis connected'));
  instance.on('error', (err) => logger.error('Redis error:', err));

  return instance;
}

redis = createRedis();

// In-memory fallback for development without Redis
const memoryStore = new Map<string, { value: string; expiry?: number }>();

export const cache = {
  async get(key: string): Promise<string | null> {
    if (redis) return redis.get(key);
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiry && Date.now() > entry.expiry) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<void> {
    if (redis) {
      if (mode === 'EX' && ttl) await redis.set(key, value, 'EX', ttl);
      else await redis.set(key, value);
      return;
    }
    memoryStore.set(key, {
      value,
      expiry: ttl ? Date.now() + ttl * 1000 : undefined,
    });
  },

  async incr(key: string): Promise<number> {
    if (redis) return redis.incr(key);
    const entry = memoryStore.get(key);
    const newVal = (parseInt(entry?.value || '0', 10) + 1);
    memoryStore.set(key, { value: String(newVal), expiry: entry?.expiry });
    return newVal;
  },

  async expire(key: string, seconds: number): Promise<void> {
    if (redis) { await redis.expire(key, seconds); return; }
    const entry = memoryStore.get(key);
    if (entry) entry.expiry = Date.now() + seconds * 1000;
  },
};

export { redis };
