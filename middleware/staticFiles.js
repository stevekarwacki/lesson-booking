const express = require('express');
const path = require('path');

/**
 * Create secure static file serving middleware for uploads
 * @param {string} uploadPath - Path to uploads directory
 * @returns {Function} Express middleware
 */
const createSecureStaticMiddleware = (uploadPath) => {
    return [
        // Security middleware
        (req, res, next) => {
            // Only serve image files
            if (!req.path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                return res.status(404).send('File not found');
            }
            
            // Set secure headers
            res.set({
                'Content-Type': 'application/octet-stream', // Prevent execution
                'X-Content-Type-Options': 'nosniff',       // Prevent MIME sniffing
                'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
            });
            
            next();
        },
        // Static file serving
        express.static(uploadPath)
    ];
};

/**
 * Pre-configured secure uploads middleware
 */
const secureUploadsMiddleware = createSecureStaticMiddleware(
    path.join(__dirname, '..', 'uploads')
);

module.exports = {
    createSecureStaticMiddleware,
    secureUploadsMiddleware
};
