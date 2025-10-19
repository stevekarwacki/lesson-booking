const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { AppSettings } = require('../models/AppSettings');

const router = express.Router();

/**
 * GET /api/assets/logo
 * Serve the company logo file
 * Public endpoint with aggressive caching
 */
router.get('/logo', async (req, res) => {
    try {
        // Get logo filename from database
        const logoFilename = await AppSettings.getSetting('branding', 'logo_url');
        
        if (!logoFilename) {
            return res.status(404).json({ error: 'No logo configured' });
        }

        // Security: ensure filename doesn't contain path traversal attempts
        const safeFilename = path.basename(logoFilename);
        
        // Construct absolute file path
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'logos');
        const filePath = path.join(uploadsDir, safeFilename);
        
        // Verify file exists and is within the uploads directory
        try {
            await fs.access(filePath);
            const realPath = await fs.realpath(filePath);
            const realUploadsDir = await fs.realpath(uploadsDir);
            
            if (!realPath.startsWith(realUploadsDir)) {
                return res.status(403).json({ error: 'Access denied' });
            }
        } catch (err) {
            return res.status(404).json({ error: 'Logo file not found' });
        }

        // Set caching and security headers
        res.set({
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
            'X-Content-Type-Options': 'nosniff'
        });

        // Stream the file
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error serving logo:', error);
        res.status(500).json({ error: 'Failed to serve logo' });
    }
});

module.exports = router;
