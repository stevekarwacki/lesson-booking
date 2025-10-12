const express = require('express');
const router = express.Router();
const { AppSettings } = require('../models/AppSettings');

// Public endpoint to get basic business information for footer, etc.
router.get('/business-info', async (req, res) => {
    try {
        // Get business settings from database
        const businessSettings = await AppSettings.getSettingsByCategory('business');
        
        // Return only public-safe information
        const publicBusinessInfo = {
            companyName: businessSettings.company_name || '',
            contactEmail: businessSettings.contact_email || '',
            phoneNumber: businessSettings.phone_number || '',
            website: businessSettings.base_url || '',
            address: businessSettings.address || '',
            socialMedia: {
                facebook: businessSettings.social_media_facebook || '',
                twitter: businessSettings.social_media_twitter || '',
                instagram: businessSettings.social_media_instagram || '',
                linkedin: businessSettings.social_media_linkedin || '',
                youtube: businessSettings.social_media_youtube || ''
            }
        };
        
        res.json(publicBusinessInfo);
    } catch (error) {
        console.error('Error fetching public business info:', error);
        // Return empty data structure instead of error to prevent footer breaking
        res.json({
            companyName: '',
            contactEmail: '',
            phoneNumber: '',
            website: '',
            address: '',
            socialMedia: {
                facebook: '',
                twitter: '',
                instagram: '',
                linkedin: '',
                youtube: ''
            }
        });
    }
});

module.exports = router;
