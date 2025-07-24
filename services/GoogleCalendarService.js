const { google } = require('googleapis');
const { InstructorGoogleToken } = require('../models/InstructorGoogleToken');

class GoogleCalendarService {
    constructor(options = {}) {
        this.clientId = options.clientId || process.env.GOOGLE_CLIENT_ID;
        this.clientSecret = options.clientSecret || process.env.GOOGLE_CLIENT_SECRET;
        this.redirectUri = options.redirectUri || process.env.GOOGLE_REDIRECT_URI;
        
        // Allow injection of mock calendar for testing
        this.mockCalendar = options.mockCalendar;
        this.isTestMode = options.isTestMode || false;
        
        this.oauth2Client = null;
        this.calendar = null;
        
        // Cache for performance
        this.cache = new Map();
        this.cacheTimeout = options.cacheTimeout || (5 * 60 * 1000); // 5 minutes
        
        this.initializeOAuth2Client();
    }
    
    initializeOAuth2Client() {
        if (this.isTestMode) {
            this.oauth2Client = { mockClient: true };
            return;
        }
        
        if (!this.clientId || !this.clientSecret || !this.redirectUri) {
            console.warn('Google Calendar: Missing OAuth2 credentials, service will be disabled');
            return;
        }
        
        this.oauth2Client = new google.auth.OAuth2(
            this.clientId,
            this.clientSecret,
            this.redirectUri
        );
    }
    
    /**
     * Generate Google OAuth2 authorization URL
     * @returns {string} Authorization URL
     */
    getAuthUrl() {
        if (this.isTestMode) {
            return 'https://test-auth-url.com/auth?test=true';
        }
        
        if (!this.oauth2Client || this.oauth2Client.mockClient) {
            throw new Error('OAuth2 client not initialized');
        }
        
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/calendar.readonly'],
            prompt: 'consent'
        });
    }
    
    /**
     * Exchange authorization code for tokens
     * @param {string} code - Authorization code from Google
     * @returns {Object} Token data
     */
    async getTokenFromCode(code) {
        if (this.isTestMode) {
            return {
                access_token: `test_access_token_${Date.now()}`,
                refresh_token: `test_refresh_token_${Date.now()}`,
                expiry_date: Date.now() + (60 * 60 * 1000),
                scope: 'https://www.googleapis.com/auth/calendar.readonly'
            };
        }
        
        if (!this.oauth2Client || this.oauth2Client.mockClient) {
            throw new Error('OAuth2 client not initialized');
        }
        
        const { tokens } = await this.oauth2Client.getToken(code);
        return tokens;
    }
    
    /**
     * Initialize calendar API for specific instructor
     * @param {number} instructorId - Instructor ID
     * @returns {Object} Calendar API instance
     */
    async initializeForInstructor(instructorId) {
        if (this.isTestMode) {
            this.calendar = this.mockCalendar || this.createMockCalendar();
            return this.calendar;
        }
        
        const tokenRecord = await InstructorGoogleToken.findByInstructorId(instructorId);
        
        if (!tokenRecord) {
            throw new Error(`No Google Calendar tokens found for instructor ${instructorId}`);
        }
        
        if (!this.oauth2Client || this.oauth2Client.mockClient) {
            throw new Error('OAuth2 client not initialized');
        }
        
        this.oauth2Client.setCredentials({
            access_token: tokenRecord.access_token,
            refresh_token: tokenRecord.refresh_token,
            expiry_date: tokenRecord.token_expiry ? tokenRecord.token_expiry.getTime() : null
        });
        
        // Handle token refresh
        this.oauth2Client.on('tokens', async (tokens) => {
            await this.updateTokens(instructorId, tokens);
        });
        
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
        return this.calendar;
    }
    
    /**
     * Get calendar events for instructor within date range
     * @param {number} instructorId - Instructor ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Array} Array of calendar events in internal format
     */
    async getEvents(instructorId, startDate, endDate) {
        const cacheKey = `${instructorId}-${startDate.toISOString()}-${endDate.toISOString()}`;
        
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        
        try {
            const calendar = await this.initializeForInstructor(instructorId);
            
            let googleEvents;
            if (this.isTestMode) {
                googleEvents = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin: startDate.toISOString(),
                    timeMax: endDate.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime',
                    maxResults: 250
                });
            } else {
                const response = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin: startDate.toISOString(),
                    timeMax: endDate.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime',
                    maxResults: 250
                });
                googleEvents = response.data.items || [];
            }
            
            const convertedEvents = this.convertToSlots(googleEvents);
            
            // Cache the results
            this.cache.set(cacheKey, { 
                data: convertedEvents, 
                timestamp: Date.now() 
            });
            
            return convertedEvents;
            
        } catch (error) {
            console.error(`Google Calendar error for instructor ${instructorId}:`, error);
            
            // Return cached data if available, otherwise empty array
            if (cached) {
                console.log(`Returning cached data for instructor ${instructorId}`);
                return cached.data;
            }
            
            return []; // Fail gracefully
        }
    }
    
    /**
     * Convert Google Calendar events to internal slot format
     * @param {Array} googleEvents - Google Calendar events
     * @returns {Array} Converted events
     */
    convertToSlots(googleEvents) {
        if (!Array.isArray(googleEvents)) {
            return [];
        }
        
        return googleEvents
            .filter(event => event && event.start && event.end)
            .map(event => {
                const startTime = new Date(event.start.dateTime || event.start.date);
                const endTime = new Date(event.end.dateTime || event.end.date);
                
                return {
                    id: `google_${event.id}`,
                    date: startTime.toISOString().split('T')[0],
                    start_slot: this.timeToSlot(startTime),
                    duration: this.calculateDuration(startTime, endTime),
                    status: 'google_calendar_busy',
                    summary: event.summary || 'Busy',
                    source: 'google_calendar',
                    google_event_id: event.id
                };
            });
    }
    
    /**
     * Convert time to slot number (15-minute increments)
     * @param {Date} date - Date object
     * @returns {number} Slot number (0-95)
     */
    timeToSlot(date) {
        return Math.floor(date.getHours() * 4 + date.getMinutes() / 15);
    }
    
    /**
     * Calculate duration between two times in slots
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @returns {number} Duration in slots
     */
    calculateDuration(startTime, endTime) {
        const diffMs = endTime - startTime;
        return Math.ceil(diffMs / (15 * 60 * 1000)); // 15-minute slots
    }
    
    /**
     * Update stored tokens for instructor
     * @param {number} instructorId - Instructor ID
     * @param {Object} tokens - New token data
     */
    async updateTokens(instructorId, tokens) {
        if (this.isTestMode) {
            console.log(`Test mode: Would update tokens for instructor ${instructorId}`);
            return;
        }
        
        await InstructorGoogleToken.createOrUpdate(instructorId, {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date
        });
    }
    
    /**
     * Check if Google Calendar is available for instructor
     * @param {number} instructorId - Instructor ID
     * @returns {boolean} True if available
     */
    async isAvailableForInstructor(instructorId) {
        if (this.isTestMode) {
            return true;
        }
        
        try {
            const tokenRecord = await InstructorGoogleToken.findByInstructorId(instructorId); 
            return !!tokenRecord && !tokenRecord.isExpired();
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Create mock calendar for testing
     * @returns {Object} Mock calendar API
     */
    createMockCalendar() {
        return {
            events: {
                list: async (params) => {
                    // Generate mock events based on date range
                    const start = new Date(params.timeMin);
                    const end = new Date(params.timeMax);
                    const mockEvents = [];
                    
                    // Add a few mock events for testing
                    const testEvent1 = new Date(start);
                    testEvent1.setHours(10, 0, 0, 0);
                    const testEvent1End = new Date(testEvent1);
                    testEvent1End.setHours(11, 0, 0, 0);
                    
                    if (testEvent1 >= start && testEvent1 <= end) {
                        mockEvents.push({
                            id: 'mock_event_1',
                            summary: 'Mock Meeting',
                            start: { dateTime: testEvent1.toISOString() },
                            end: { dateTime: testEvent1End.toISOString() }
                        });
                    }
                    
                    const testEvent2 = new Date(start);
                    testEvent2.setDate(testEvent2.getDate() + 1);
                    testEvent2.setHours(14, 30, 0, 0);
                    const testEvent2End = new Date(testEvent2);
                    testEvent2End.setHours(15, 30, 0, 0);
                    
                    if (testEvent2 >= start && testEvent2 <= end) {
                        mockEvents.push({
                            id: 'mock_event_2',
                            summary: 'Mock Appointment',
                            start: { dateTime: testEvent2.toISOString() },
                            end: { dateTime: testEvent2End.toISOString() }
                        });
                    }
                    
                    return mockEvents;
                }
            }
        };
    }
    
    /**
     * Clear cache for instructor
     * @param {number} instructorId - Instructor ID (optional)
     */
    clearCache(instructorId = null) {
        if (instructorId) {
            // Clear cache entries for specific instructor
            for (const key of this.cache.keys()) {
                if (key.startsWith(`${instructorId}-`)) {
                    this.cache.delete(key);
                }
            }
        } else {
            // Clear all cache
            this.cache.clear();
        }
    }
}

module.exports = GoogleCalendarService; 