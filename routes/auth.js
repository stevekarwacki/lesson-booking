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
// GOOGLE CALENDAR AUTHENTICATION ROUTES
// =====================================================

/**
 * Get Google Calendar OAuth URL for instructor
 * Protected route - requires valid JWT token and instructor permission
 */
router.get('/google/auth-url/:instructorId', authMiddleware, instructorAuth, async (req, res) => {
    try {
        const service = new GoogleCalendarService();
        
        // Check if service is properly configured
        if (!service.oauth2Client || service.oauth2Client.mockClient) {
            return res.status(503).json({ 
                error: 'Google Calendar integration not configured',
                message: 'Please contact administrator to set up Google Calendar integration'
            });
        }
        
        const authUrl = service.getAuthUrl();
        
        res.json({ 
            authUrl,
            instructorId: req.params.instructorId,
            message: 'Visit this URL to authorize Google Calendar access'
        });
        
    } catch (error) {
        console.error('Error generating Google auth URL:', error);
        res.status(500).json({ 
            error: 'Failed to generate authorization URL',
            details: error.message 
        });
    }
});

/**
 * Handle Google OAuth callback and store tokens
 * Protected route - requires valid JWT token and instructor permission
 */
router.post('/google/callback', authMiddleware, async (req, res) => {
    try {
        const { code, instructorId } = req.body;
        
        if (!code || !instructorId) {
            return res.status(400).json({ 
                error: 'Authorization code and instructor ID are required' 
            });
        }
        
        // Verify the instructor exists and user has permission
        const instructorIdInt = parseInt(instructorId, 10);
        
        // For callback, we need to check permissions manually since instructorAuth middleware expects :instructorId in params
        const { Instructor } = require('../models/Instructor');
        const instructors = await Instructor.getAll();
        const instructor = instructors.find(i => i.id === instructorIdInt);
        
        if (!instructor) {
            return res.status(404).json({ error: 'Instructor not found' });
        }
        
        // Check if the current user is either the instructor or an admin
        if (instructor.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const service = new GoogleCalendarService();
        
        // Exchange code for tokens
        const tokens = await service.getTokenFromCode(code);
        
        // Store tokens in database
        const { token, created } = await InstructorGoogleToken.createOrUpdate(instructorIdInt, tokens);
        
        res.json({ 
            success: true,
            message: created ? 'Google Calendar connected successfully' : 'Google Calendar tokens updated',
            instructorId: instructorIdInt,
            connectedAt: token.created_at || token.updated_at
        });
        
    } catch (error) {
        console.error('Error handling Google OAuth callback:', error);
        
        // Handle specific OAuth errors
        if (error.message.includes('invalid_grant')) {
            return res.status(400).json({ 
                error: 'Invalid authorization code',
                message: 'The authorization code has expired or is invalid. Please try connecting again.'
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to save Google Calendar tokens',
            details: error.message 
        });
    }
});

/**
 * Check Google Calendar connection status for instructor
 * Protected route - requires valid JWT token and instructor permission
 */
router.get('/google/status/:instructorId', authMiddleware, instructorAuth, async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
        
        const token = await InstructorGoogleToken.findByInstructorId(instructorId);
        
        if (!token) {
            return res.json({ 
                connected: false,
                message: 'Google Calendar not connected'
            });
        }
        
        const isExpired = token.isExpired();
        
        res.json({ 
            connected: !isExpired,
            connectedAt: token.created_at,
            lastUpdated: token.updated_at,
            expired: isExpired,
            scope: token.scope,
            message: isExpired ? 'Google Calendar connection expired' : 'Google Calendar connected'
        });
        
    } catch (error) {
        console.error('Error checking Google Calendar status:', error);
        res.status(500).json({ 
            error: 'Failed to check Google Calendar status',
            details: error.message 
        });
    }
});

/**
 * Disconnect Google Calendar for instructor
 * Protected route - requires valid JWT token and instructor permission
 */
router.delete('/google/disconnect/:instructorId', authMiddleware, instructorAuth, async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
        
        const deletedCount = await InstructorGoogleToken.removeByInstructorId(instructorId);
        
        if (deletedCount === 0) {
            return res.status(404).json({ 
                error: 'No Google Calendar connection found',
                message: 'This instructor does not have Google Calendar connected'
            });
        }
        
        res.json({ 
            success: true,
            message: 'Google Calendar disconnected successfully',
            instructorId,
            disconnectedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error disconnecting Google Calendar:', error);
        res.status(500).json({ 
            error: 'Failed to disconnect Google Calendar',
            details: error.message 
        });
    }
});

/**
 * Test Google Calendar connection for instructor
 * Protected route - requires valid JWT token and instructor permission
 * This endpoint helps verify that the connection works
 */
router.get('/google/test/:instructorId', authMiddleware, instructorAuth, async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
        
        const service = new GoogleCalendarService();
        
        // Check availability first
        const isAvailable = await service.isAvailableForInstructor(instructorId);
        
        if (!isAvailable) {
            return res.status(400).json({
                connected: false,
                error: 'Google Calendar not available',
                message: 'Please connect Google Calendar first'
            });
        }
        
        // Try to fetch a small sample of events (today only)
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const events = await service.getEvents(instructorId, today, tomorrow);
        
        res.json({
            connected: true,
            working: true,
            message: 'Google Calendar connection is working',
            testResults: {
                eventsFound: events.length,
                dateRange: {
                    start: today.toISOString().split('T')[0],
                    end: tomorrow.toISOString().split('T')[0]
                },
                sampleEvents: events.slice(0, 3).map(event => ({
                    summary: event.summary,
                    date: event.date,
                    startSlot: event.start_slot,
                    duration: event.duration
                }))
            }
        });
        
    } catch (error) {
        console.error('Error testing Google Calendar connection:', error);
        
        res.status(500).json({
            connected: false,
            working: false,
            error: 'Google Calendar connection test failed',
            details: error.message,
            message: 'There was an error testing the Google Calendar connection. Please try reconnecting.'
        });
    }
});

module.exports = router; 