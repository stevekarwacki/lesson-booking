const createRedisCache = require('./redis');
const createMemoryCache = require('./memory');

/**
 * Creates a cache instance based on environment variables
 * @returns {CacheInterface}
 */
const createCache = () => {
    const cacheType = process.env.CACHE_TYPE || 'memory';
    
    switch (cacheType.toLowerCase()) {
        case 'redis':
            if (!process.env.REDIS_URL) {
                console.warn('Redis cache selected but REDIS_URL not provided. Falling back to memory cache.');
                return createMemoryCache();
            }
            return createRedisCache({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD,
                db: process.env.REDIS_DB || 0,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                }
            });
            
        case 'memory':
        default:
            return createMemoryCache();
    }
};

module.exports = createCache; 