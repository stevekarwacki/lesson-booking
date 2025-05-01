let Redis;
try {
    Redis = require('ioredis');
} catch (error) {
    console.warn('ioredis not installed. Redis caching will not be available.');
    Redis = null;
}

const { createCache } = require('./interface');

/**
 * Creates a Redis-based cache implementation
 * @param {Object} config - Redis configuration
 * @returns {Object} Cache implementation with get, set, del, and clear methods
 */
const createRedisCache = (config) => {
    if (!Redis) {
        // throw new Error('Redis caching is not available. Please install ioredis to use Redis caching.');
        return
    }
    
    const client = new Redis(config);
    
    return createCache({
        /**
         * Get a value from the cache
         * @param {string} key - The cache key
         * @returns {Promise<any>} - The cached value or null if not found
         */
        get: async (key) => {
            const value = await client.get(key);
            return value ? JSON.parse(value) : null;
        },
        
        /**
         * Set a value in the cache
         * @param {string} key - The cache key
         * @param {any} value - The value to cache
         * @param {number} [ttl] - Time to live in seconds
         * @returns {Promise<void>}
         */
        set: async (key, value, ttl) => {
            const serializedValue = JSON.stringify(value);
            if (ttl) {
                await client.setex(key, ttl, serializedValue);
            } else {
                await client.set(key, serializedValue);
            }
        },
        
        /**
         * Delete a value from the cache
         * @param {string} key - The cache key
         * @returns {Promise<void>}
         */
        del: async (key) => {
            await client.del(key);
        },
        
        /**
         * Clear all values from the cache
         * @returns {Promise<void>}
         */
        clear: async () => {
            await client.flushall();
        }
    });
};

module.exports = createRedisCache; 