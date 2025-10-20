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

// Public endpoint to get all UI configuration (no auth required)
// Principle: If it affects how the UI renders, it should be public
router.get('/config', async (req, res) => {
    try {
        const lessonSettings = await AppSettings.getSettingsByCategory('lessons');
        const themeSettings = await AppSettings.getSettingsByCategory('theme');
        
        // Return all non-sensitive configuration needed for UI rendering
        const publicConfig = {
            // Lesson configuration
            default_duration_minutes: parseInt(lessonSettings.default_duration_minutes) || 30,
            in_person_payment_enabled: lessonSettings.in_person_payment_enabled === 'true',
            
            // Theme configuration for UI styling
            theme: {
                primary_color: themeSettings.primary_color || '#28a745',
                secondary_color: themeSettings.secondary_color || '#20c997',
                palette_name: themeSettings.palette_name || 'Forest Green'
            },
            
            // Add other UI-affecting config here as needed
            // max_booking_days: parseInt(lessonSettings.max_booking_days) || 30,
            // timezone: lessonSettings.timezone || 'UTC',
        };
        
        res.json(publicConfig);
    } catch (error) {
        console.error('Error fetching public config:', error);
        // Return default values to prevent app breaking
        res.json({
            default_duration_minutes: 30,
            in_person_payment_enabled: false
        });
    }
});

module.exports = router;
