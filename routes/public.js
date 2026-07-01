const express = require('express');
const router = express.Router();
const { AppSettings } = require('../models/AppSettings');
const { getThemeDefaults, getBusinessHoursDefaults } = require('../utils/constants');
const { sequelize } = require('../db');

// Lightweight health check used by deploy/rollback smoke tests.
// Returns 200 when the server is up and the DB connection is alive.
// A 3-second timeout on the DB ping prevents a slow/hung connection from
// stalling the smoke test and consuming a retry window.
router.get('/health', async (req, res) => {
    try {
        if (!sequelize) {
            return res.status(503).json({ status: 'error', message: 'Database not connected' });
        }
        let timeoutId;
        const timeout = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('DB ping timed out')), 3000);
        });
        try {
            await Promise.race([sequelize.authenticate(), timeout]);
        } finally {
            clearTimeout(timeoutId);
        }
        res.json({ status: 'ok' });
    } catch (error) {
        res.status(503).json({ status: 'error', message: error.message || 'Database unreachable' });
    }
});

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
        const businessHours = await AppSettings.getBusinessHours();
        
        // Return all non-sensitive configuration needed for UI rendering
        const publicConfig = {
            // Lesson configuration
            default_duration_minutes: parseInt(lessonSettings.default_duration_minutes) || 30,
            in_person_payment_enabled: lessonSettings.in_person_payment_enabled === 'true',
            card_payment_on_behalf_enabled: lessonSettings.card_payment_on_behalf_enabled === 'true',
            
            // Theme configuration for UI styling
            theme: {
                primary_color: themeSettings.primary_color || getThemeDefaults().primary_color,
                secondary_color: themeSettings.secondary_color || getThemeDefaults().secondary_color,
                palette_name: themeSettings.palette_name || getThemeDefaults().palette_name
            },
            
            // Business hours for calendar rendering
            businessHours: businessHours,
            
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
            in_person_payment_enabled: false,
            card_payment_on_behalf_enabled: false,
            businessHours: getBusinessHoursDefaults(),
            theme: getThemeDefaults()
        });
    }
});

module.exports = router;
