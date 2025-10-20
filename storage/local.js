const path = require('path');
const fs = require('fs').promises;
const { createStorage } = require('./interface');
const { 
    ensureDirectoryExists, 
    generateUniqueFilename 
} = require('../utils/fileOperations');

/**
 * Creates a local filesystem storage implementation
 * Files are stored in the uploads directory and served via Express controller
 * @returns {Object} Storage implementation with interface methods
 */
const createLocalStorage = () => {
    return createStorage({
        /**
         * Save file to local filesystem
         * @param {Buffer} buffer - File buffer to save
         * @param {string} filename - Original filename
         * @param {string} directory - Subdirectory within uploads (e.g., 'logos')
         * @returns {Promise<{url: string, filename: string}>} Public URL and filename
         */
        save: async (buffer, filename, directory) => {
            try {
                const uniqueFilename = generateUniqueFilename(filename);
                const uploadDir = path.join(__dirname, '..', 'uploads', directory);
                
                await ensureDirectoryExists(uploadDir);
                const filePath = path.join(uploadDir, uniqueFilename);
                
                await fs.writeFile(filePath, buffer);
                
                // Return public URL that will be served by /api/assets/*
                const publicUrl = `/api/assets/${directory}/${uniqueFilename}`;
                
                return {
                    url: publicUrl,
                    filename: uniqueFilename
                };
            } catch (error) {
                throw new Error(`Failed to save file locally: ${error.message}`);
            }
        },

        /**
         * Retrieve file from local filesystem
         * @param {string} filepath - Relative file path (e.g., 'logos/filename.png')
         * @returns {Promise<Buffer>} File buffer
         */
        get: async (filepath) => {
            try {
                const fullPath = path.join(__dirname, '..', 'uploads', filepath);
                
                // Security: Prevent path traversal
                const realPath = await fs.realpath(fullPath);
                const uploadsDir = await fs.realpath(path.join(__dirname, '..', 'uploads'));
                
                if (!realPath.startsWith(uploadsDir)) {
                    throw new Error('Access denied: path traversal attempt detected');
                }
                
                return await fs.readFile(fullPath);
            } catch (error) {
                throw new Error(`Failed to retrieve file from local storage: ${error.message}`);
            }
        },

        /**
         * Delete file from local filesystem
         * @param {string} filepath - Relative file path (e.g., 'logos/filename.png')
         * @returns {Promise<boolean>} True if deleted, false if didn't exist
         */
        delete: async (filepath) => {
            try {
                const fullPath = path.join(__dirname, '..', 'uploads', filepath);
                
                // Security: Prevent path traversal
                const realPath = await fs.realpath(fullPath);
                const uploadsDir = await fs.realpath(path.join(__dirname, '..', 'uploads'));
                
                if (!realPath.startsWith(uploadsDir)) {
                    throw new Error('Access denied: path traversal attempt detected');
                }
                
                await fs.unlink(fullPath);
                return true;
            } catch (error) {
                if (error.code === 'ENOENT') {
                    return false; // File didn't exist
                }
                throw new Error(`Failed to delete file from local storage: ${error.message}`);
            }
        },

        /**
         * Check if file exists in local filesystem
         * @param {string} filepath - Relative file path (e.g., 'logos/filename.png')
         * @returns {Promise<boolean>} True if file exists
         */
        exists: async (filepath) => {
            try {
                const fullPath = path.join(__dirname, '..', 'uploads', filepath);
                
                // Security: Prevent path traversal
                const realPath = await fs.realpath(fullPath);
                const uploadsDir = await fs.realpath(path.join(__dirname, '..', 'uploads'));
                
                if (!realPath.startsWith(uploadsDir)) {
                    return false;
                }
                
                await fs.access(fullPath);
                return true;
            } catch {
                return false;
            }
        },

        /**
         * Get public URL for file
         * @param {string} filepath - Relative file path (e.g., 'logos/filename.png')
         * @returns {string} Public URL
         */
        getPublicUrl: (filepath) => {
            return `/api/assets/${filepath}`;
        }
    });
};

module.exports = createLocalStorage;
