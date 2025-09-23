const sharp = require('sharp');
const { fileTypeFromBuffer } = require('file-type');

/**
 * Validate image dimensions against minimum requirements
 * @param {Buffer} buffer - Image buffer
 * @param {number} minWidth - Minimum width in pixels
 * @param {number} minHeight - Minimum height in pixels
 * @returns {Promise<{width: number, height: number}>} Image dimensions
 * @throws {Error} If image is too small or invalid
 */
const validateImageDimensions = async (buffer, minWidth = 50, minHeight = 50) => {
    const metadata = await sharp(buffer).metadata();
    const { width, height } = metadata;
    
    if (width < minWidth || height < minHeight) {
        throw new Error(`Image is too small. Minimum size is ${minWidth}x${minHeight} pixels. Your image is ${width}x${height}.`);
    }
    
    return { width, height };
};

/**
 * Validate file type using file-type library for security
 * @param {Buffer} buffer - File buffer
 * @param {string[]} allowedTypes - Array of allowed MIME type prefixes (e.g., ['image/'])
 * @returns {Promise<Object>} File type information
 * @throws {Error} If file type is not allowed
 */
const validateFileType = async (buffer, allowedTypes = ['image/']) => {
    const fileType = await fileTypeFromBuffer(buffer);
    
    if (!fileType) {
        throw new Error('Could not determine file type');
    }
    
    const isAllowed = allowedTypes.some(type => fileType.mime.startsWith(type));
    if (!isAllowed) {
        throw new Error(`Invalid file type. Only ${allowedTypes.join(', ')} files are allowed.`);
    }
    
    return fileType;
};

/**
 * Calculate target dimensions that fit within max bounds while preserving aspect ratio
 * @param {number} width - Original width
 * @param {number} height - Original height  
 * @param {number} maxWidth - Maximum allowed width
 * @param {number} maxHeight - Maximum allowed height
 * @returns {{width: number, height: number, needsResize: boolean}}
 */
const calculateTargetDimensions = (width, height, maxWidth, maxHeight) => {
    if (width <= maxWidth && height <= maxHeight) {
        return { width, height, needsResize: false };
    }
    
    // Calculate scale factors for both dimensions
    const scaleWidth = maxWidth / width;
    const scaleHeight = maxHeight / height;
    
    // Use the smaller scale factor to ensure both dimensions fit within bounds
    const scale = Math.min(scaleWidth, scaleHeight);
    
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);
    
    return { 
        width: targetWidth, 
        height: targetHeight, 
        needsResize: true 
    };
};

/**
 * Process image: resize if needed, optimize format
 * @param {Buffer} buffer - Original image buffer
 * @param {Object} options - Processing options
 * @param {number} options.maxWidth - Maximum width (default: 320)
 * @param {number} options.maxHeight - Maximum height (default: 80)
 * @param {string} options.format - Output format (default: 'png')
 * @param {Object} options.background - Background color for transparent areas
 * @returns {Promise<{buffer: Buffer, dimensions: Object, wasResized: boolean, originalDimensions: Object}>}
 */
const processImage = async (buffer, options = {}) => {
    const {
        maxWidth = 400,
        maxHeight = 100,
        format = 'png',
        background = { r: 255, g: 255, b: 255, alpha: 0 }
    } = options;
    
    const metadata = await sharp(buffer).metadata();
    const { width: originalWidth, height: originalHeight } = metadata;
    
    const { width: targetWidth, height: targetHeight, needsResize } = calculateTargetDimensions(
        originalWidth, 
        originalHeight, 
        maxWidth, 
        maxHeight
    );
    
    let processedBuffer = buffer;
    
    if (needsResize) {
        const sharpInstance = sharp(buffer)
            .resize(targetWidth, targetHeight, {
                fit: 'contain',
                background
            });
            
        // Apply format conversion
        if (format === 'png') {
            processedBuffer = await sharpInstance.png().toBuffer();
        } else if (format === 'jpeg') {
            processedBuffer = await sharpInstance.jpeg({ quality: 90 }).toBuffer();
        } else {
            processedBuffer = await sharpInstance.toBuffer();
        }
    }
    
    return {
        buffer: processedBuffer,
        dimensions: { width: targetWidth, height: targetHeight },
        wasResized: needsResize,
        originalDimensions: { width: originalWidth, height: originalHeight }
    };
};

/**
 * Get image metadata
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Object>} Image metadata
 */
const getImageMetadata = async (buffer) => {
    return await sharp(buffer).metadata();
};

module.exports = {
    validateImageDimensions,
    validateFileType,
    calculateTargetDimensions,
    processImage,
    getImageMetadata
};
