/**
 * Storage interface that defines the standard storage methods
 * @typedef {Object} StorageInterface
 * @property {function(Buffer, string, string): Promise<{url: string, filename: string}>} save - Save file and return URL
 * @property {function(string): Promise<Buffer>} get - Retrieve file as buffer
 * @property {function(string): Promise<boolean>} delete - Delete file
 * @property {function(string): Promise<boolean>} exists - Check if file exists
 * @property {function(string): string} getPublicUrl - Get public URL for file
 */

/**
 * Validates that an object implements the storage interface
 * @param {Object} storage - The storage implementation to validate
 * @throws {Error} If the storage implementation is invalid
 */
const validateStorageInterface = (storage) => {
    const requiredMethods = ['save', 'get', 'delete', 'exists', 'getPublicUrl'];
    const missingMethods = requiredMethods.filter(method => 
        typeof storage[method] !== 'function'
    );
    
    if (missingMethods.length > 0) {
        throw new Error(`Storage implementation missing required methods: ${missingMethods.join(', ')}`);
    }
};

/**
 * Creates a new storage implementation with interface validation
 * @param {Object} implementation - The storage implementation to wrap
 * @returns {Object} Validated storage implementation
 */
const createStorage = (implementation) => {
    validateStorageInterface(implementation);
    return implementation;
};

module.exports = {
    validateStorageInterface,
    createStorage
};
