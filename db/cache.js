const Redis = require('ioredis')

const redis = new Redis({
    host: 'localhost',
    port: 6379,
    // Optional: Enable persistence
    save: [['900', '1'], ['300', '10']],
})

// Default cache expiration time (1 hour)
const DEFAULT_EXPIRATION = 3600

redis.on('error', (err) => {
    console.error('Redis Cache Error:', err)
})

// Wrapper for cache operations
const cache = {
    // Get data from cache
    async get(key) {
        try {
            const data = await redis.get(key)
            return data ? JSON.parse(data) : null
        } catch (err) {
            console.error('Cache Get Error:', err)
            return null
        }
    },

    // Set data in cache
    async set(key, data, expiration = DEFAULT_EXPIRATION) {
        try {
            await redis.set(key, JSON.stringify(data), 'EX', expiration)
        } catch (err) {
            console.error('Cache Set Error:', err)
        }
    },

    // Delete from cache
    async del(key) {
        try {
            await redis.del(key)
        } catch (err) {
            console.error('Cache Delete Error:', err)
        }
    },

    // Clear cache by pattern
    async clear(pattern) {
        try {
            const keys = await redis.keys(pattern)
            if (keys.length > 0) {
                await redis.del(keys)
            }
        } catch (err) {
            console.error('Cache Clear Error:', err)
        }
    }
}

module.exports = cache 