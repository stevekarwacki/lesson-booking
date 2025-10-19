const path = require('path');
const { AppSettings } = require('../models/AppSettings');
const { validateImageDimensions, validateFileType, processImage } = require('./imageProcessing');
const { saveFileWithUrl, deleteFileIfExists } = require('./fileOperations');
const LOGO_CONFIG = require('../constants/logoConfig');

/**
 * Process and save uploaded logo
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

    // Save the processed logo
    const { filename } = await saveFileWithUrl(processed.buffer, originalname, LOGO_CONFIG.UPLOAD_DIRECTORY);

    // Store only the filename in settings (not the full path)
    await AppSettings.setSetting('branding', 'logo_url', filename, userId);

    return {
        logoUrl: filename,
        info: {
            originalDimensions: processed.originalDimensions,
            finalDimensions: processed.dimensions,
            wasResized: processed.wasResized,
            fileType: fileType.mime
        }
    };
};

/**
 * Remove logo from filesystem and database
 * @returns {Promise<boolean>} True if logo was removed, false if no logo existed
 */
const removeLogo = async () => {
    const logoFilename = await AppSettings.getSetting('branding', 'logo_url');
    
    if (!logoFilename) {
        return false;
    }
    
    // Remove file from filesystem
    const filePath = path.join(__dirname, '..', 'uploads', 'logos', logoFilename);
    const deleted = await deleteFileIfExists(filePath);
    
    if (!deleted) {
        console.warn('Logo file not found on filesystem:', filePath);
    }
    
    // Remove from database
    await AppSettings.deleteSetting('branding', 'logo_url');
    
    return true;
};

module.exports = {
    processLogoUpload,
    removeLogo
};
