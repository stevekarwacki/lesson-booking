const fs = require('fs').promises;
const path = require('path');

/**
 * Ensure directory exists, create if it doesn't
 * @param {string} dirPath - Directory path to ensure
 * @returns {Promise<void>}
 */
const ensureDirectoryExists = async (dirPath) => {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
};

/**
 * Generate a unique filename with timestamp prefix
 * @param {string} originalName - Original filename
 * @param {string} extension - File extension (optional, will extract from originalName if not provided)
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalName, extension = null) => {
    const timestamp = Date.now();
    const ext = extension || path.extname(originalName) || '.png';
    const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const baseName = path.parse(safeName).name;
    
    return `${timestamp}_${baseName}${ext}`;
};

/**
 * Save buffer to file
 * @param {Buffer} buffer - File buffer to save
 * @param {string} directory - Target directory
 * @param {string} filename - Target filename
 * @returns {Promise<string>} Full file path
 */
const saveBufferToFile = async (buffer, directory, filename) => {
    await ensureDirectoryExists(directory);
    const filePath = path.join(directory, filename);
    await fs.writeFile(filePath, buffer);
    return filePath;
};

/**
 * Delete file if it exists
 * @param {string} filePath - File path to delete
 * @returns {Promise<boolean>} True if file was deleted, false if it didn't exist
 */
const deleteFileIfExists = async (filePath) => {
    try {
        await fs.unlink(filePath);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return false; // File didn't exist
        }
        throw error; // Re-throw other errors
    }
};

/**
 * Save file and return web-accessible URL
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - Original filename
 * @param {string} baseDirectory - Base directory (e.g., 'uploads/logos')
 * @returns {Promise<{filePath: string, webUrl: string}>}
 */
const saveFileWithUrl = async (buffer, originalName, baseDirectory) => {
    const filename = generateUniqueFilename(originalName);
    const fullDirectory = path.join(__dirname, '..', baseDirectory);
    
    const filePath = await saveBufferToFile(buffer, fullDirectory, filename);
    const webUrl = `/${baseDirectory}/${filename}`;
    
    return { filePath, webUrl };
};

module.exports = {
    ensureDirectoryExists,
    generateUniqueFilename,
    saveBufferToFile,
    deleteFileIfExists,
    saveFileWithUrl
};
