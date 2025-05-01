const { createCache } = require('./interface');

/**
 * Creates an in-memory cache implementation
 * @returns {Object} Cache implementation with get, set, del, and clear methods
 */
const createMemoryCache = () => {
    const store = new Map();
    const timeouts = new Map();
    
    const del = async (key) => {
        store.delete(key);
        if (timeouts.has(key)) {
            clearTimeout(timeouts.get(key));
            timeouts.delete(key);
        }
    };
    
    return createCache({
        /**
         * Get a value from the cache
         * @param {string} key - The cache key
         * @returns {Promise<any>} - The cached value or null if not found
         */
        get: async (key) => {
            const item = store.get(key);
            if (!item) return null;
            
            // Check if item has expired
            if (item.expires && item.expires < Date.now()) {
                await del(key);
                return null;
            }
            
            return item.value;
        },
        
        /**
         * Set a value in the cache
         * @param {string} key - The cache key
         * @param {any} value - The value to cache
         * @param {number} [ttl] - Time to live in seconds
         * @returns {Promise<void>}
         */
        set: async (key, value, ttl) => {
            const item = {
                value,
                expires: ttl ? Date.now() + (ttl * 1000) : null
            };
            
            store.set(key, item);
            
            // Clear existing timeout if any
            if (timeouts.has(key)) {
                clearTimeout(timeouts.get(key));
            }
            
            // Set new timeout if TTL is provided
            if (ttl) {
                const timeout = setTimeout(() => {
                    store.delete(key);
                    timeouts.delete(key);
                }, ttl * 1000);
                timeouts.set(key, timeout);
            }
        },
        
        del,
        
        /**
         * Clear all values from the cache
         * @returns {Promise<void>}
         */
        clear: async () => {
            store.clear();
            for (const timeout of timeouts.values()) {
                clearTimeout(timeout);
            }
            timeouts.clear();
        }
    });
};

module.exports = createMemoryCache; 