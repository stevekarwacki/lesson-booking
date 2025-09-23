const express = require('express');
const router = express.Router();
const { AppSettings } = require('../models/AppSettings');
const LOGO_CONFIG = require('../constants/logoConfig');

// Public route for branding information (logo, company name)
router.get('/', async (req, res) => {
    try {
        // Fetch public branding info
        const logoUrl = await AppSettings.getSetting('branding', 'logo_url');
        const logoPosition = await AppSettings.getSetting('branding', 'logo_position');
        const companyName = await AppSettings.getSetting('business', 'company_name');
        
        const defaultPosition = LOGO_CONFIG.POSITION_OPTIONS.find(opt => opt.default)?.value || 'left';
        
        res.json({ 
            logoUrl: logoUrl || null,
            logoPosition: logoPosition || defaultPosition,
            companyName: companyName || '',
            logoConfig: {
                maxWidth: LOGO_CONFIG.MAX_WIDTH,
                maxHeight: LOGO_CONFIG.MAX_HEIGHT,
                minWidth: LOGO_CONFIG.MIN_WIDTH,
                minHeight: LOGO_CONFIG.MIN_HEIGHT,
                maxFileSize: LOGO_CONFIG.MAX_FILE_SIZE,
                allowedFormats: 'JPG, PNG, WebP',
                positionOptions: LOGO_CONFIG.POSITION_OPTIONS
            }
        });
    } catch (error) {
        console.error('Error fetching branding info:', error);
        res.status(500).json({ error: 'Error fetching branding information' });
    }
});

module.exports = router;
