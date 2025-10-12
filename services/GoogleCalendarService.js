const { google } = require('googleapis');
const { InstructorCalendarConfig } = require('../models/InstructorCalendarConfig');
const { 
    timeToSlotUTC, 
    calculateDurationInSlots 
} = require('../utils/timeUtils');
const { today, fromTimestamp } = require('../utils/dateHelpers');

class GoogleCalendarService {
    constructor(options = {}) {
        // Service account configuration
        this.serviceAccountEmail = options.serviceAccountEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        this.serviceAccountKey = options.serviceAccountKey || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
        this.serviceAccountKeyFile = options.serviceAccountKeyFile || process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
        
        this.auth = null;
        this.calendar = null;
        
        // Cache for performance
        this.cache = new Map();
        this.cacheTimeout = options.cacheTimeout || (5 * 60 * 1000); // 5 minutes
        
        this.initializeServiceAccount();
    }
    
    initializeServiceAccount() {
         // Check if we have service account credentials
        if (!this.serviceAccountEmail && !this.serviceAccountKeyFile && !this.serviceAccountKey) {
            console.warn('Google Calendar: Missing service account credentials, service will be disabled');
            return;
        }
        
        try {
            // Initialize Google Auth for service account
            let authOptions = {
                scopes: ['https://www.googleapis.com/auth/calendar.readonly']
            };
            
            // Use key file if provided, otherwise use inline credentials
            if (this.serviceAccountKeyFile) {
                authOptions.keyFile = this.serviceAccountKeyFile;
            } else if (this.serviceAccountEmail && this.serviceAccountKey) {
                authOptions.credentials = {
                    client_email: this.serviceAccountEmail,
                    private_key: this.serviceAccountKey.replace(/\\n/g, '\n')
                };
            } else {
                throw new Error('Invalid service account configuration');
            }
            
            this.auth = new google.auth.GoogleAuth(authOptions);
            this.calendar = google.calendar({ version: 'v3', auth: this.auth });
            
        } catch (error) {
            console.error('Failed to initialize Google service account:', error);
            this.auth = null;
            this.calendar = null;
        }
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
            // Get calendar configuration for instructor
            const config = await InstructorCalendarConfig.findByInstructorId(instructorId);
            if (!config) {
                return [];
            }
            
            if (!this.calendar) {
                return [];
            }
            
            const response = await this.calendar.events.list({
                calendarId: config.calendar_id,
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 250
            });
            const googleEvents = response.data.items || [];
            
            const convertedEvents = this.convertToSlots(googleEvents, config.all_day_event_handling);
            
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
                return cached.data;
            }
            
            return []; // Fail gracefully
        }
    }
    
    /**
     * Test calendar access for instructor
     * @param {number} instructorId - Instructor ID
     * @returns {Object} Test results
     */
    async testCalendarAccess(instructorId) {
        try {
            const config = await InstructorCalendarConfig.findByInstructorId(instructorId);
            if (!config) {
                return {
                    success: false,
                    message: 'No calendar configuration found for this instructor'
                };
            }
            
            if (!this.calendar) {
                return {
                    success: false,
                    message: 'Google Calendar service not initialized. Please check server configuration.'
                };
            }
            
            // Try to fetch a small number of events from today
            const todayHelper = today()
            const tomorrowHelper = todayHelper.addDays(1)
            
            const response = await this.calendar.events.list({
                calendarId: config.calendar_id,
                timeMin: todayHelper.toDate().toISOString(),
                timeMax: tomorrowHelper.toDate().toISOString(),
                maxResults: 5
            });
            
            const events = response.data.items || [];
            
            // Update test status in config
            await config.updateTestStatus('success');
            
            return {
                success: true,
                message: 'Calendar connection working properly',
                eventsFound: events.length,
                calendarId: config.calendar_id,
                calendarName: config.calendar_name || config.calendar_id
            };
            
        } catch (error) {
            console.error(`Calendar test failed for instructor ${instructorId}:`, error);
            
            // Update test status in config
            const config = await InstructorCalendarConfig.findByInstructorId(instructorId);
            if (config) {
                await config.updateTestStatus('failed');
            }
            
            let errorMessage = 'Unknown error occurred';
            if (error.code === 404) {
                errorMessage = 'Calendar not found. Please check the calendar ID and ensure it\'s shared with the service account.';
            } else if (error.code === 403) {
                errorMessage = 'Access denied. Please ensure the calendar is shared with the service account email.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return {
                success: false,
                message: errorMessage,
                error: error.code || 'UNKNOWN_ERROR'
            };
        }
    }
    
    /**
     * Convert Google Calendar events to internal slot format
     * @param {Array} googleEvents - Google Calendar events
     * @param {string} allDayHandling - How to handle all-day events ('ignore', 'block')
     * @returns {Array} Converted events
     */
    convertToSlots(googleEvents, allDayHandling = 'ignore') {
        if (!Array.isArray(googleEvents)) {
            return [];
        }
        
        return googleEvents
            .filter(event => event && event.start && event.end)
            .map(event => {
                const isAllDayEvent = !event.start.dateTime; // All-day events only have 'date', not 'dateTime'
                
                // Handle all-day events based on configuration
                if (isAllDayEvent) {
                    return this.handleAllDayEvent(event, allDayHandling);
                }
                
                // Handle regular timed events
                const startTime = new Date(event.start.dateTime);
                const endTime = new Date(event.end.dateTime);
                
                return [{
                    id: `google_${event.id}`,
                    date: this.getLocalDateString(startTime),
                    start_slot: this.timeToSlot(startTime),
                    duration: this.calculateDuration(startTime, endTime),
                    type: 'booked', // Frontend expects 'type' field, not 'status'
                    status: 'google_calendar_busy', // Keep for backend identification
                    summary: event.summary || 'Busy',
                    source: 'google_calendar',
                    google_event_id: event.id,
                    // Normalize student data to nested structure  
                    student: {
                        id: null,
                        name: '🗓️ ' + (event.summary || 'Busy'),
                        email: 'Google Calendar'
                    },
                    is_google_calendar: true
                }];
            })
            .flat() // Flatten arrays from all-day events
            .filter(event => event !== null); // Remove null entries (ignored all-day events)
    }
    
    /**
     * Handle all-day events based on configuration
     * @param {Object} event - Google Calendar event
     * @param {string} allDayHandling - How to handle all-day events ('ignore', 'block')
     * @returns {Array} Array of converted events (empty array if ignored)
     */
    handleAllDayEvent(event, allDayHandling) {
        const eventDate = event.start.date; // All-day events use 'date' not 'dateTime'
        
        switch (allDayHandling) {
            case 'ignore':
                return []; // Return empty array
                
            case 'block':
                // Create events for the entire day (all 96 slots)
                return this.createAllDayBlockingEvents(event, eventDate);
                
            default:
                return []; // Default to ignore
        }
    }
    
    /**
     * Create blocking events for the entire day
     * @param {Object} event - Google Calendar event
     * @param {string} eventDate - Date string (YYYY-MM-DD)
     * @returns {Array} Array with single blocking event covering the entire day
     */
    createAllDayBlockingEvents(event, eventDate) {
        // Create one large blocking event for the entire day (slots 0-95)
        return [{
            id: `google_allday_${event.id}`,
            date: eventDate,
            start_slot: 0,
            duration: 96, // All 96 slots (24 hours)
            type: 'booked',
            status: 'google_calendar_all_day',
            summary: `🗓️ All Day: ${event.summary || 'Busy'}`,
            source: 'google_calendar',
            google_event_id: event.id,
            student: {
                id: null,
                name: `🗓️ All Day: ${event.summary || 'Busy'}`,
                email: 'Google Calendar'
            },
            is_google_calendar: true,
            is_all_day: true
        }];
    }
    
    /**
     * Get local date string without timezone shifting
     * @param {Date} date - Date object
     * @returns {string} Date string in YYYY-MM-DD format
     */
    getLocalDateString(date) {
        return fromTimestamp(date.getTime()).toDateString()
    }
    
    /**
     * Convert time to slot number (15-minute increments) - UTC version
     * @param {Date} date - Date object
     * @returns {number} Slot number (0-95)
     */
    timeToSlot(date) {
        // Use UTC utility function for consistency
        return timeToSlotUTC(date);
    }
    
    /**
     * Calculate duration between two times in slots - UTC version
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @returns {number} Duration in slots
     */
    calculateDuration(startTime, endTime) {
        // Use UTC utility function for consistency
        return calculateDurationInSlots(startTime, endTime);
    }
    
    /**
     * Check if Google Calendar is available for instructor
     * @param {number} instructorId - Instructor ID
     * @returns {boolean} True if available
     */
    async isAvailableForInstructor(instructorId) {
        try {
            const config = await InstructorCalendarConfig.findByInstructorId(instructorId); 
            return !!config && config.is_active;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Get service account email for sharing instructions
     * @returns {string} Service account email
     */
    getServiceAccountSignal() {
        return this.serviceAccountEmail || 'Service account email not configured';
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