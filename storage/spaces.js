let S3Client;
let PutObjectCommand;
let GetObjectCommand;
let DeleteObjectCommand;
let HeadObjectCommand;

try {
    const { S3Client: S3ClientImport } = require('@aws-sdk/client-s3');
    const { 
        PutObjectCommand: PutObjectCommandImport,
        GetObjectCommand: GetObjectCommandImport,
        DeleteObjectCommand: DeleteObjectCommandImport,
        HeadObjectCommand: HeadObjectCommandImport
    } = require('@aws-sdk/client-s3');
    
    S3Client = S3ClientImport;
    PutObjectCommand = PutObjectCommandImport;
    GetObjectCommand = GetObjectCommandImport;
    DeleteObjectCommand = DeleteObjectCommandImport;
    HeadObjectCommand = HeadObjectCommandImport;
} catch (error) {
    S3Client = null;
}

const { createStorage } = require('./interface');
const { generateUniqueFilename } = require('../utils/fileOperations');
const logger = require('../utils/logger');

/**
 * Creates a DigitalOcean Spaces (S3-compatible) storage implementation
 * Requires AWS SDK v3 to be installed
 * @param {Object} config - Storage configuration
 * @param {string} config.endpoint - Spaces endpoint (e.g., 'nyc3.digitaloceanspaces.com')
 * @param {string} config.region - Spaces region (e.g., 'nyc3')
 * @param {string} config.bucket - Spaces bucket name
 * @param {string} config.accessKeyId - Access key ID from env
 * @param {string} config.secretAccessKey - Secret access key from env
 * @param {string} [config.cdnUrl] - Optional CDN URL for public access
 * @returns {Object|null} Storage implementation or null if AWS SDK not available
 */
const createSpacesStorage = (config) => {
    if (!S3Client) {
        logger.warn('AWS SDK v3 not installed. Spaces storage unavailable. Install with: npm install @aws-sdk/client-s3');
        return null;
    }
    
    const {
        endpoint,
        region,
        bucket,
        accessKeyId,
        secretAccessKey,
        cdnUrl
    } = config;
    
    // Validate required configuration
    const missingConfig = [];
    if (!endpoint) missingConfig.push('endpoint');
    if (!region) missingConfig.push('region');
    if (!bucket) missingConfig.push('bucket');
    if (!accessKeyId) missingConfig.push('accessKeyId');
    if (!secretAccessKey) missingConfig.push('secretAccessKey');
    
    if (missingConfig.length > 0) {
        throw new Error(`Missing required Spaces configuration: ${missingConfig.join(', ')}`);
    }
    
    // Initialize S3 client for Spaces
    const s3Client = new S3Client({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey
        },
        endpoint: `https://${endpoint}`
    });
    
    return createStorage({
        /**
         * Save file to DigitalOcean Spaces
         * @param {Buffer} buffer - File buffer to save
         * @param {string} filename - Original filename
         * @param {string} directory - Directory prefix in bucket (e.g., 'logos')
         * @returns {Promise<{url: string, filename: string}>} Public URL and filename
         */
        save: async (buffer, filename, directory) => {
            try {
                const uniqueFilename = generateUniqueFilename(filename);
                const key = `${directory}/${uniqueFilename}`;
                
                const command = new PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: buffer,
                    ACL: 'public-read'
                });
                
                await s3Client.send(command);
                
                // Build public URL
                const url = cdnUrl 
                    ? `${cdnUrl}/${key}`
                    : `https://${bucket}.${endpoint}/${key}`;
                
                return {
                    url,
                    filename: uniqueFilename
                };
            } catch (error) {
                throw new Error(`Failed to save file to Spaces: ${error.message}`);
            }
        },

        /**
         * Retrieve file from DigitalOcean Spaces
         * @param {string} filepath - File key in bucket (e.g., 'logos/filename.png')
         * @returns {Promise<Buffer>} File buffer
         */
        get: async (filepath) => {
            try {
                const command = new GetObjectCommand({
                    Bucket: bucket,
                    Key: filepath
                });
                
                const response = await s3Client.send(command);
                
                // Convert stream to buffer
                const chunks = [];
                for await (const chunk of response.Body) {
                    chunks.push(chunk);
                }
                
                return Buffer.concat(chunks);
            } catch (error) {
                throw new Error(`Failed to retrieve file from Spaces: ${error.message}`);
            }
        },

        /**
         * Delete file from DigitalOcean Spaces
         * @param {string} filepath - File key in bucket (e.g., 'logos/filename.png')
         * @returns {Promise<boolean>} True if deleted or didn't exist
         */
        delete: async (filepath) => {
            try {
                const command = new DeleteObjectCommand({
                    Bucket: bucket,
                    Key: filepath
                });
                
                await s3Client.send(command);
                return true;
            } catch (error) {
                // Spaces returns 204 even if file doesn't exist, so we always return true
                if (error.Code === 'NoSuchKey') {
                    return false;
                }
                throw new Error(`Failed to delete file from Spaces: ${error.message}`);
            }
        },

        /**
         * Check if file exists in DigitalOcean Spaces
         * @param {string} filepath - File key in bucket (e.g., 'logos/filename.png')
         * @returns {Promise<boolean>} True if file exists
         */
        exists: async (filepath) => {
            try {
                const command = new HeadObjectCommand({
                    Bucket: bucket,
                    Key: filepath
                });
                
                await s3Client.send(command);
                return true;
            } catch (error) {
                if (error.Code === 'NotFound' || error.name === '404') {
                    return false;
                }
                throw new Error(`Failed to check file existence in Spaces: ${error.message}`);
            }
        },

        /**
         * Get public URL for file in DigitalOcean Spaces
         * @param {string} filepath - File key in bucket (e.g., 'logos/filename.png')
         * @returns {string} Public URL
         */
        getPublicUrl: (filepath) => {
            if (cdnUrl) {
                return `${cdnUrl}/${filepath}`;
            }
            return `https://${bucket}.${endpoint}/${filepath}`;
        }
    });
};

module.exports = createSpacesStorage;
