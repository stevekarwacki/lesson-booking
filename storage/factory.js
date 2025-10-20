const createLocalStorage = require('./local');
const createSpacesStorage = require('./spaces');
const logger = require('../utils/logger');

/**
 * Creates a storage instance based on configuration
 * Reads storage type from AppSettings and provider-specific config
 * Falls back to local storage if remote storage initialization fails
 * 
 * @param {Object} options - Factory options
 * @param {Object} options.appSettings - AppSettings model for reading config
 * @param {string} [options.defaultType] - Default storage type (default: 'local')
 * @returns {Promise<Object>} Storage implementation
 */
const createStorageFactory = async (options = {}) => {
    const {
        appSettings,
        defaultType = 'local'
    } = options;
    
    try {
        let storageType = defaultType;
        let storageConfig = {};
        
        // If AppSettings is provided, read configuration from database
        if (appSettings) {
            try {
                const typeFromDb = await appSettings.getSetting('storage', 'storage_type');
                if (typeFromDb) {
                    storageType = typeFromDb;
                }
                
                // If type is 'spaces', read Spaces configuration
                if (storageType === 'spaces') {
                    storageConfig = {
                        endpoint: await appSettings.getSetting('storage', 'storage_endpoint'),
                        region: await appSettings.getSetting('storage', 'storage_region'),
                        bucket: await appSettings.getSetting('storage', 'storage_bucket'),
                        cdnUrl: await appSettings.getSetting('storage', 'storage_cdn_url')
                    };
                    
                    // Get credentials from environment variables
                    storageConfig.accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
                    storageConfig.secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
                }
            } catch (error) {
                logger.warn('Could not read storage configuration from AppSettings', { error: error.message });
                // Fall through to use default storage type
            }
        }
        
        // Create storage instance based on type
        switch (storageType.toLowerCase()) {
            case 'spaces': {
                // Validate that required environment variables are present
                if (!process.env.STORAGE_ACCESS_KEY_ID || !process.env.STORAGE_SECRET_ACCESS_KEY) {
                    logger.warn('Spaces storage selected but credentials not provided in environment. Falling back to local storage.');
                    return createLocalStorage();
                }
                
                // Validate that required AppSettings are configured
                if (!storageConfig.endpoint || !storageConfig.region || !storageConfig.bucket) {
                    logger.warn('Spaces storage selected but endpoint, region, or bucket not configured in AppSettings. Falling back to local storage.');
                    return createLocalStorage();
                }
                
                const spacesStorage = createSpacesStorage(storageConfig);
                if (!spacesStorage) {
                    logger.warn('Failed to initialize Spaces storage. Falling back to local storage.');
                    return createLocalStorage();
                }
                
                logger.warn(`Spaces storage initialized - Bucket: ${storageConfig.bucket}, Region: ${storageConfig.region}`);
                return spacesStorage;
            }
            
            case 'local':
            default:
                if (storageType !== 'local' && storageType !== defaultType) {
                    logger.warn(`Unknown storage type '${storageType}'. Falling back to local storage.`);
                }
                return createLocalStorage();
        }
    } catch (error) {
        logger.error('Error creating storage', { error: error.message });
        return createLocalStorage();
    }
};

module.exports = createStorageFactory;
