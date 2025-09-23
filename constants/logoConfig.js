/**
 * Logo configuration constants
 */
const LOGO_CONFIG = {
    // Maximum logo dimensions (will be resized to fit within these bounds)
    MAX_WIDTH: 400,
    MAX_HEIGHT: 100,
    
    // Minimum logo dimensions (will reject smaller uploads)
    MIN_WIDTH: 50,
    MIN_HEIGHT: 50,
    
    // File size limit in bytes
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    
    // Allowed file formats
    ALLOWED_FORMATS: ['image/'],
    
    // Output format for processed logos
    OUTPUT_FORMAT: 'png',
    
    // Upload directory
    UPLOAD_DIRECTORY: 'uploads/logos',
    
    // Logo position options
    POSITION_OPTIONS: [
        { value: 'left', label: 'Left side of header', default: true },
        { value: 'center', label: 'Center of header' }
    ]
};

module.exports = LOGO_CONFIG;
