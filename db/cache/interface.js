/**
 * Cache interface that defines the standard caching methods
 * @typedef {Object} CacheInterface
 * @property {function(string): Promise<any>} get - Get a value from the cache
 * @property {function(string, any, number?): Promise<void>} set - Set a value in the cache
 * @property {function(string): Promise<void>} del - Delete a value from the cache
 * @property {function(): Promise<void>} clear - Clear all values from the cache
 */

/**
 * Validates that an object implements the cache interface
 * @param {Object} cache - The cache implementation to validate
 * @throws {Error} If the cache implementation is invalid
 */
const validateCacheInterface = (cache) => {
    const requiredMethods = ['get', 'set', 'del', 'clear'];
    const missingMethods = requiredMethods.filter(method => 
        typeof cache[method] !== 'function'
    );
    
    if (missingMethods.length > 0) {
        throw new Error(`Cache implementation missing required methods: ${missingMethods.join(', ')}`);
    }
    
    // Validate method signatures
    if (cache.get.length !== 1) {
        throw new Error('get method must accept exactly one parameter (key)');
    }
    if (cache.set.length < 2 || cache.set.length > 3) {
        throw new Error('set method must accept 2-3 parameters (key, value, [ttl])');
    }
    if (cache.del.length !== 1) {
        throw new Error('del method must accept exactly one parameter (key)');
    }
    if (cache.clear.length !== 0) {
        throw new Error('clear method must accept no parameters');
    }
};

/**
 * Creates a new cache implementation with interface validation
 * @param {Object} implementation - The cache implementation to wrap
 * @returns {Object} Validated cache implementation
 */
const createCache = (implementation) => {
    validateCacheInterface(implementation);
    return implementation;
};

module.exports = {
    validateCacheInterface,
    createCache
}; 