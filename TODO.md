# Redis Implementation Plan

## Tasks
- [x] Add ioredis dependency to package.json
- [x] Create lib/redis.ts for Redis connection and utilities
- [x] Update app/api/eco-scanner/route.ts to add caching
- [x] Create/update .env.local with Redis environment variables
- [x] Add cache utility functions (getCached, setCache, deleteCache, cacheAside)
- [ ] Install and configure Redis server (followup)
- [ ] Test caching functionality (followup)
- [ ] Monitor performance improvements (followup)

## Redis Configuration (.env.local)
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Usage Examples
```typescript
import { getCached, setCache, cacheAside } from '@/lib/redis';

// Simple get/set
const cached = await getCached<MyType>('my-key');
await setCache('my-key', myData, 3600); // 1 hour TTL

// Cache-aside pattern (recommended)
const data = await cacheAside('my-key', async () => {
  return await fetchExpensiveData();
}, 3600);
```

## Next Steps
1. Install Redis server locally or use a cloud provider (Redis Cloud, Upstash)
2. **Option A - Docker**: Start Docker Desktop, then run: `docker run -d --name greenguardian-redis -p 6379:6379 redis:alpine`
3. **Option B - Cloud**: Use free tier from Upstash (https://upstash.com) or Redis Cloud
4. Test the eco-scanner endpoint to verify caching works

## Cloud Redis Setup (Upstash - Recommended for Free Tier)
1. Sign up at https://upstash.com
2. Create a new Redis database
3. Copy the connection details to .env.local:
   ```
   REDIS_HOST=your-endpoint.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=your-password
   ```
