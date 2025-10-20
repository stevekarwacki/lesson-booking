const { AppSettings } = require('../models/AppSettings');
const { validateImageDimensions, validateFileType, processImage } = require('./imageProcessing');
const { getStorage } = require('../storage/index');
const LOGO_CONFIG = require('../constants/logoConfig');

/**
 * Process and save uploaded logo using configured storage
 * @param {Buffer} buffer - Image file buffer
 * @param {string} originalname - Original filename
 * @param {number} userId - User ID for database record
 * @returns {Promise<Object>} Processing result with logo URL and info
 */
const processLogoUpload = async (buffer, originalname, userId) => {
    // Validate file type for extra security
    const fileType = await validateFileType(buffer, LOGO_CONFIG.ALLOWED_FORMATS);

    // Validate minimum dimensions
    await validateImageDimensions(buffer, LOGO_CONFIG.MIN_WIDTH, LOGO_CONFIG.MIN_HEIGHT);

    // Process the logo (resize if needed)
    const processed = await processImage(buffer, {
        maxWidth: LOGO_CONFIG.MAX_WIDTH,
        maxHeight: LOGO_CONFIG.MAX_HEIGHT,
        format: LOGO_CONFIG.OUTPUT_FORMAT
    });

    // Save the processed logo using storage abstraction
    const storage = getStorage();
    const { url, filename } = await storage.save(
        processed.buffer,
        originalname,
        'logos'
    );

    // Store only the filename in settings (not the full path/URL)
    await AppSettings.setSetting('branding', 'logo_url', filename, userId);

    return {
        logoUrl: url,
        info: {
            originalDimensions: processed.originalDimensions,
            finalDimensions: processed.dimensions,
            wasResized: processed.wasResized,
            fileType: fileType.mime
        }
    };
};

/**
 * Remove logo from storage and database
 * @returns {Promise<boolean>} True if logo was removed, false if no logo existed
 */
const removeLogo = async () => {
    const logoFilename = await AppSettings.getSetting('branding', 'logo_url');
    
    if (!logoFilename) {
        return false;
    }
    
    // Remove file from storage
    const storage = getStorage();
    const deleted = await storage.delete(`logos/${logoFilename}`);
    
    if (!deleted) {
        // Log but don't fail - logo file might have been manually deleted
        console.warn('Logo file not found in storage:', logoFilename);
    }
    
    // Remove from database
    await AppSettings.deleteSetting('branding', 'logo_url');
    
    return true;
};

module.exports = {
    processLogoUpload,
    removeLogo
};
