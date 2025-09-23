const multer = require('multer');
const LOGO_CONFIG = require('../constants/logoConfig');

/**
 * Create upload middleware with specified configuration
 * @param {Object} options - Upload configuration options
 * @param {number} options.maxSize - Maximum file size in bytes (default: 5MB)
 * @param {string[]} options.allowedTypes - Allowed MIME type prefixes (default: ['image/'])
 * @param {string} options.fieldName - Form field name (default: 'file')
 * @returns {Function} Configured multer middleware
 */
const createUploadMiddleware = (options = {}) => {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB default
        allowedTypes = ['image/'],
        fieldName = 'file'
    } = options;

    const upload = multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: maxSize
        },
        fileFilter: (req, file, cb) => {
            const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
            if (isAllowed) {
                cb(null, true);
            } else {
                cb(new Error(`Only ${allowedTypes.join(', ')} files are allowed`), false);
            }
        }
    });

    return upload.single(fieldName);
};

/**
 * Pre-configured middleware for logo uploads
 */
const logoUpload = createUploadMiddleware({
    maxSize: LOGO_CONFIG.MAX_FILE_SIZE,
    allowedTypes: LOGO_CONFIG.ALLOWED_FORMATS,
    fieldName: 'logo'
});

module.exports = {
    createUploadMiddleware,
    logoUpload
};
