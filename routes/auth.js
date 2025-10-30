const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const GoogleCalendarService = require('../services/GoogleCalendarService');
const { authMiddleware } = require('../middleware/auth');
const instructorAuth = require('../middleware/instructorAuth');

// Secret key for JWT - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'student'
        });
        
        // Create token for new user
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
        
        // Return user data and token
        res.json({
            message: 'User created successfully',
            token,
            user: User.getPlainObject(user)
        });
    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        return res.status(500).json({ 
            error: 'Error creating user',
            details: error.message 
        });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await User.findByEmail(email);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
        
        // Get plain object representation of user
        const userData = User.getPlainObject(user);
        
        res.json({
            message: 'Login successful',
            token,
            user: userData
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error during login' });
    }
});

// Route to get current user data
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.json(User.getPlainObject(user));
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Error fetching user data' });
    }
});

// =====================================================
// GOOGLE CALENDAR CONFIGURATION ROUTES
// =====================================================

const { InstructorCalendarConfig } = require('../models/InstructorCalendarConfig');

/**
 * Get calendar configuration for instructor
 * Protected route - requires valid JWT token and instructor permission
 */
router.get('/calendar/config/:instructorId', authMiddleware, instructorAuth, async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
        
        const config = await InstructorCalendarConfig.findByInstructorId(instructorId);
        
        if (!config) {
            return res.json({ 
                connected: false,
                message: 'No calendar configuration found'
            });
        }
        
        res.json({ 
            connected: true,
            config: {
                calendar_id: config.calendar_id,
                calendar_name: config.calendar_name,
                calendar_type: config.calendar_type,
                all_day_event_handling: config.all_day_event_handling,
                is_active: config.is_active,
                last_tested_at: config.last_tested_at,
                last_test_status: config.last_test_status
            },
            connectedAt: config.created_at,
            lastUpdated: config.updated_at,
            message: 'Calendar configuration found'
        });
        
    } catch (error) {
        console.error('Error fetching calendar configuration:', error);
        res.status(500).json({ 
            error: 'Failed to fetch calendar configuration',
            details: error.message 
        });
    }
});

/**
 * Set calendar configuration for instructor
 * Protected route - requires valid JWT token and instructor permission
 */
router.post('/calendar/config/:instructorId', authMiddleware, instructorAuth, async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
        const { calendar_id, calendar_name, calendar_type } = req.body;
        
    
        
        if (!calendar_id) {
            return res.status(400).json({ 
                error: 'Calendar ID is required',
                message: 'Please provide a valid Google Calendar ID (usually your email address)'
            });
        }
        
        // Validate calendar_id format (basic email validation)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(calendar_id) && !calendar_id.includes('calendar.google.com')) {

            return res.status(400).json({ 
                error: 'Invalid calendar ID format',
                message: `"${calendar_id}" is not a valid format. Please use an email address (like user@gmail.com) or a Google Calendar ID containing 'calendar.google.com'`
            });
        }
        

        
        // Create or update the configuration
        const { config, created } = await InstructorCalendarConfig.createOrUpdate(instructorId, {
            calendar_id: calendar_id.trim(),
            calendar_name: calendar_name ? calendar_name.trim() : null,
            calendar_type: calendar_type || 'personal'
        });
        
        res.json({ 
            success: true,
            message: created ? 'Calendar connected successfully' : 'Calendar configuration updated',
            config: {
                calendar_id: config.calendar_id,
                calendar_name: config.calendar_name,
                calendar_type: config.calendar_type,
                is_active: config.is_active
            },
            instructorId,
            connectedAt: config.created_at || config.updated_at
        });
        
    } catch (error) {
        console.error('Error saving calendar configuration:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to save calendar configuration',
            details: error.message 
        });
    }
});

/**
 * Get setup information for service account sharing
 * Protected route - requires valid JWT token and instructor permission
 */
router.get('/calendar/setup-info/:instructorId', authMiddleware, instructorAuth, async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
        const service = new GoogleCalendarService();
        const serviceAccountEmail = service.getServiceAccountSignal();
        
        // Check if OAuth is available
        const oauthConfigured = googleOAuthService.isConfigured();
        const { InstructorGoogleToken } = require('../models/InstructorGoogleToken');
        const oauthStatus = oauthConfigured
            ? await InstructorGoogleToken.findByInstructorId(instructorId)
            : null;

        res.json({
            // Existing service account info
            serviceAccountEmail,
            instructions: {
                step1: 'Go to Google Calendar (calendar.google.com)',
                step2: 'Find your calendar in the left sidebar',
                step3: 'Click the three dots next to your calendar name',
                step4: 'Select "Settings and sharing"',
                step5: `Add "${serviceAccountEmail}" to "Share with specific people"`,
                step6: 'Give "See all event details" permission',
                step7: 'Copy your calendar ID (usually your email) and paste it in the form above'
            },
            
            // NEW: OAuth info
            oauth: {
                available: oauthConfigured,
                connected: !!oauthStatus,
                connectedAt: oauthStatus?.created_at || null,
                scopes: oauthStatus?.scope || null,
                message: oauthConfigured
                    ? 'OAuth is available. You can connect via OAuth for easier setup.'
                    : 'OAuth not configured on server.'
            }
        });
        
    } catch (error) {
        console.error('Error getting setup info:', error);
        res.status(500).json({
            error: 'Failed to get setup information',
            details: error.message
        });
    }
});

/**
 * Disconnect calendar for instructor
 * Protected route - requires valid JWT token and instructor permission
 */
router.delete('/calendar/config/:instructorId', authMiddleware, instructorAuth, async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
        
        const updatedCount = await InstructorCalendarConfig.removeByInstructorId(instructorId);
        
        if (updatedCount === 0) {
            return res.status(404).json({ 
                error: 'No calendar configuration found',
                message: 'This instructor does not have a calendar configured'
            });
        }
        
        res.json({ 
            success: true,
            message: 'Calendar disconnected successfully',
            instructorId,
            disconnectedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error disconnecting calendar:', error);
        res.status(500).json({ 
            error: 'Failed to disconnect calendar',
            details: error.message 
        });
    }
});

/**
 * Update calendar configuration settings for instructor
 * Protected route - requires valid JWT token and instructor permission
 */
router.patch('/calendar/config/:instructorId', authMiddleware, instructorAuth, async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
        const { all_day_event_handling } = req.body;
        
        // Validate all_day_event_handling value
        if (all_day_event_handling && !['ignore', 'block'].includes(all_day_event_handling)) {
            return res.status(400).json({
                error: 'Invalid all_day_event_handling value',
                message: 'Must be either "ignore" or "block"'
            });
        }
        
        // Find existing configuration
        const config = await InstructorCalendarConfig.findByInstructorId(instructorId);
        
        if (!config) {
            return res.status(404).json({
                error: 'No calendar configuration found',
                message: 'This instructor does not have a calendar configured'
            });
        }
        
        // Update the configuration
        const updateData = {};
        if (all_day_event_handling !== undefined) {
            updateData.all_day_event_handling = all_day_event_handling;
        }
        
        await config.update(updateData);
        
        res.json({
            success: true,
            message: 'Calendar configuration updated successfully',
            config: {
                id: config.id,
                calendar_id: config.calendar_id,
                calendar_name: config.calendar_name,
                calendar_type: config.calendar_type,
                all_day_event_handling: config.all_day_event_handling,
                last_test_status: config.last_test_status
            }
        });
        
    } catch (error) {
        console.error('Error updating calendar configuration:', error);
        res.status(500).json({
            error: 'Failed to update calendar configuration',
            details: error.message
        });
    }
});

/**
 * Test calendar connection for instructor
 * Protected route - requires valid JWT token and instructor permission
 * This endpoint helps verify that the connection works
 */
router.get('/calendar/test/:instructorId', authMiddleware, instructorAuth, async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
        
        const service = new GoogleCalendarService();
        
        // Check availability first
        const isAvailable = await service.isAvailableForInstructor(instructorId);
        
        if (!isAvailable) {
            return res.status(400).json({
                connected: false,
                error: 'Calendar not configured',
                message: 'Please configure calendar connection first'
            });
        }
        
        // Test the actual calendar access
        const testResult = await service.testCalendarAccess(instructorId);
        
        if (testResult.success) {
            res.json({
                connected: true,
                working: true,
                message: testResult.message,
                testResults: {
                    eventsFound: testResult.eventsFound,
                    calendarId: testResult.calendarId,
                    calendarName: testResult.calendarName
                }
            });
        } else {
            res.status(400).json({
                connected: false,
                working: false,
                error: testResult.message,
                details: testResult.error
            });
        }
        
    } catch (error) {
        console.error('Error testing calendar connection:', error);
        
        res.status(500).json({
            connected: false,
            working: false,
            error: 'Calendar connection test failed',
            details: error.message
        });
    }
});

// =====================================================
// GOOGLE OAUTH ROUTES
// =====================================================

const googleOAuthService = require('../config/googleOAuth');

/**
 * Generate OAuth authorization URL
 * Protected route - requires valid JWT token and instructor permission
 */
router.post('/google/authorize/:instructorId', authMiddleware, instructorAuth, async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);

        if (!googleOAuthService.isConfigured()) {
            return res.status(503).json({
                error: 'OAuth not configured',
                message: 'Google OAuth is not configured on the server. Please contact your administrator.'
            });
        }

        const authUrl = googleOAuthService.generateAuthUrl(instructorId);

        res.json({
            success: true,
            url: authUrl,
            message: 'Authorization URL generated. Redirect user to this URL.'
        });

    } catch (error) {
        res.status(500).json({
            error: 'Failed to generate authorization URL',
            details: error.message
        });
    }
});

/**
 * Handle OAuth callback from Google
 * This endpoint receives the authorization code and exchanges it for tokens
 */
router.post('/google/callback', authMiddleware, async (req, res) => {
    try {
        const { code, instructorId } = req.body;

        if (!code) {
            return res.status(400).json({
                error: 'Authorization code required',
                message: 'No authorization code provided'
            });
        }

        if (!instructorId) {
            return res.status(400).json({
                error: 'Instructor ID required',
                message: 'No instructor ID provided'
            });
        }

        // Exchange code for tokens
        const tokens = await googleOAuthService.exchangeCodeForTokens(code);

        // Store tokens in database
        const { InstructorGoogleToken } = require('../models/InstructorGoogleToken');
        const { token, created } = await InstructorGoogleToken.createOrUpdate(
            instructorId,
            {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expiry_date: tokens.expiry_date,
                scope: tokens.scope
            }
        );

        res.json({
            success: true,
            message: created ? 'Google account connected successfully' : 'Google account tokens updated',
            connectedAt: token.created_at || token.updated_at
        });

    } catch (error) {
        console.error('OAuth callback error:', error);
        
        if (error.message?.includes('invalid_grant')) {
            return res.status(400).json({
                error: 'Invalid authorization code',
                message: 'The authorization code has expired or is invalid. Please try connecting again.'
            });
        }

        res.status(500).json({
            error: 'Failed to complete OAuth authorization',
            details: error.message
        });
    }
});

/**
 * Get OAuth connection status for instructor
 * Protected route - requires valid JWT token and instructor permission
 */
router.get('/google/status/:instructorId', authMiddleware, instructorAuth, async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);

        const { InstructorGoogleToken } = require('../models/InstructorGoogleToken');
        const token = await InstructorGoogleToken.findByInstructorId(instructorId);

        if (!token) {
            return res.json({
                connected: false,
                message: 'Google account not connected'
            });
        }

        // Check if token is expired
        const isExpired = token.isExpired();
        const hasRefreshToken = !!token.refresh_token;

        res.json({
            connected: true,
            isExpired: isExpired,
            canRefresh: hasRefreshToken,
            scope: token.scope,
            connectedAt: token.created_at,
            lastUpdated: token.updated_at,
            expiresAt: token.token_expiry,
            message: 'Google account connected'
        });

    } catch (error) {
        console.error('Error checking OAuth status:', error);
        res.status(500).json({
            error: 'Failed to check OAuth status',
            details: error.message
        });
    }
});

/**
 * Disconnect Google OAuth for instructor
 * Protected route - requires valid JWT token and instructor permission
 */
router.delete('/google/disconnect/:instructorId', authMiddleware, instructorAuth, async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);

        const { InstructorGoogleToken } = require('../models/InstructorGoogleToken');
        const deletedCount = await InstructorGoogleToken.removeByInstructorId(instructorId);

        if (deletedCount === 0) {
            return res.status(404).json({
                error: 'No Google connection found',
                message: 'This instructor does not have a Google account connected'
            });
        }

        res.json({
            success: true,
            message: 'Google account disconnected successfully',
            instructorId,
            disconnectedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error disconnecting Google OAuth:', error);
        res.status(500).json({
            error: 'Failed to disconnect Google account',
            details: error.message
        });
    }
});

module.exports = router;