const createStorageFactory = require('./factory');
let storageInstance = null;

/**
 * Initialize storage system
 * Should be called during application startup
 * 
 * @param {Object} options - Initialization options
 * @param {Object} [options.appSettings] - AppSettings model for reading config from database
 * @returns {Promise<Object>} Initialized storage instance
 */
const initializeStorage = async (options = {}) => {
    if (storageInstance) {
        return storageInstance;
    }
    
    try {
        storageInstance = await createStorageFactory(options);
        return storageInstance;
    } catch (error) {
        console.error('Failed to initialize storage system:', error);
        throw error;
    }
};

/**
 * Get the current storage instance
 * Must call initializeStorage first
 * 
 * @returns {Object} Storage instance
 * @throws {Error} If storage not yet initialized
 */
const getStorage = () => {
    if (!storageInstance) {
        throw new Error('Storage not initialized. Call initializeStorage() during application startup.');
    }
    return storageInstance;
};

/**
 * Reset storage instance (useful for testing)
 */
const resetStorage = () => {
    storageInstance = null;
};

module.exports = {
    initializeStorage,
    getStorage,
    resetStorage
};
