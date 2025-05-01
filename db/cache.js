const createCache = require('./cache/factory');

// Default cache expiration time (1 hour)
const DEFAULT_EXPIRATION = 3600;

// Create cache instance using factory
const cache = createCache();

// Export cache with default expiration
module.exports = {
    ...cache,
    set: async (key, data, expiration = DEFAULT_EXPIRATION) => {
        return cache.set(key, data, expiration);
    }
}; 