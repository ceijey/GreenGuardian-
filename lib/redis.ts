import Redis from 'ioredis';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  lazyConnect: true,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

// Create Redis client instance
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);

    // Event handlers
    redisClient.on('connect', () => {
      console.log('🔗 Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis client ready');
    });

    redisClient.on('close', () => {
      console.log('🔌 Redis connection closed');
    });
  }

  return redisClient;
}

// Export the client instance for direct use
export { redisClient as redis };

// Cache utility functions
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    return null;
  } catch (error) {
    console.warn('⚠️ Redis getCached error:', error);
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<boolean> {
  try {
    const redis = getRedisClient();
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('⚠️ Redis setCache error:', error);
    return false;
  }
}

export async function deleteCache(key: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    await redis.del(key);
    return true;
  } catch (error) {
    console.warn('⚠️ Redis deleteCache error:', error);
    return false;
  }
}

export async function deleteCachePattern(pattern: string): Promise<number> {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return keys.length;
  } catch (error) {
    console.warn('⚠️ Redis deleteCachePattern error:', error);
    return 0;
  }
}

// Cache-aside pattern helper
export async function cacheAside<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  // Try to get from cache first
  const cached = await getCached<T>(key);
  if (cached !== null) {
    console.log(`✅ Cache hit: ${key}`);
    return cached;
  }

  // Fetch fresh data
  console.log(`🔄 Cache miss: ${key}`);
  const freshData = await fetchFn();

  // Store in cache (non-blocking)
  setCache(key, freshData, ttlSeconds);

  return freshData;
}

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('❌ Redis health check failed:', error);
    return false;
  }
}
