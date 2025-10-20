const express = require('express');
const { AppSettings } = require('../models/AppSettings');
const { getStorage } = require('../storage/index');

const router = express.Router();

/**
 * GET /api/assets/logo
 * Serve the company logo file from configured storage
 * Public endpoint with aggressive caching
 */
router.get('/logo', async (req, res) => {
    try {
        // Get logo filename from database
        const logoFilename = await AppSettings.getSetting('branding', 'logo_url');
        
        if (!logoFilename) {
            return res.status(404).json({ error: 'No logo configured' });
        }

        // Retrieve file from storage
        const storage = getStorage();
        const buffer = await storage.get(`logos/${logoFilename}`);

        // Set caching and security headers
        res.set({
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
            'X-Content-Type-Options': 'nosniff'
        });

        // Send file buffer
        res.send(buffer);
    } catch (error) {
        // Check if it's a file not found error
        if (error.message && (error.message.includes('not found') || error.message.includes('ENOENT'))) {
            return res.status(404).json({ error: 'Logo file not found' });
        }
        
        console.error('Error serving logo:', error);
        res.status(500).json({ error: 'Failed to serve logo' });
    }
});

module.exports = router;
