const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { InstructorGoogleToken } = require('../models/InstructorGoogleToken');
const GoogleCalendarService = require('../services/GoogleCalendarService');
const { authMiddleware } = require('../middleware/auth');
const instructorAuth = require('../middleware/instructorAuth');

// Secret key for JWT - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    
    // Add logging to debug
    console.log('Received signup request:', { name, email });
    
    if (!name || !email || !password) {
        console.log('Missing required fields');
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

        console.log('User created successfully:', user.id);
        
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
        const service = new GoogleCalendarService();
        const serviceAccountEmail = service.getServiceAccountSignal();
        
        res.json({
            serviceAccountEmail,
            instructions: {
                step1: 'Go to Google Calendar (calendar.google.com)',
                step2: 'Find your calendar in the left sidebar',
                step3: 'Click the three dots next to your calendar name',
                step4: 'Select "Settings and sharing"',
                step5: `Add "${serviceAccountEmail}" to "Share with specific people"`,
                step6: 'Give "See all event details" permission',
                step7: 'Copy your calendar ID (usually your email) and paste it in the form above'
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

module.exports = router; 