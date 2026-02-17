const { google } = require('googleapis');
const { InstructorCalendarConfig } = require('../models/InstructorCalendarConfig');
const { today } = require('../utils/dateHelpers');
const { getCalendarMethod, getServiceAccountCredentials } = require('../config/calendarConfig');
const config = require('../config');

/**
 * Create a new GoogleCalendarService instance
 * @param {Object} options - Configuration options
 * @returns {Object} Service instance with methods
 */
const createGoogleCalendarService = (options = {}) => {
    let auth = null;
    let calendar = null;
    
    // Cache for performance
    const cache = new Map();
    const cacheTimeout = options.cacheTimeout || (5 * 60 * 1000); // 5 minutes

    /**
     * Initialize service account auth client from DB-backed credentials
     * @returns {Promise<void>}
     */
    const initializeServiceAccount = async () => {
        const creds = await getServiceAccountCredentials();
        const keyFile = config.googleServiceAccount.keyFile;

        if (!creds.email && !keyFile && !creds.privateKey) {
            console.warn('Google Calendar: Missing service account credentials, service will be disabled');
            return;
        }
        
        try {
            const authOptions = {
                scopes: ['https://www.googleapis.com/auth/calendar.readonly']
            };
            
            if (keyFile) {
                authOptions.keyFile = keyFile;
            } else if (creds.email && creds.privateKey) {
                authOptions.credentials = {
                    client_email: creds.email,
                    private_key: creds.privateKey.replace(/\\n/g, '\n')
                };
            } else {
                throw new Error('Invalid service account configuration');
            }
            
            auth = new google.auth.GoogleAuth(authOptions);
            calendar = google.calendar({ version: 'v3', auth });
            
        } catch (error) {
            console.error('Failed to initialize Google service account:', error);
            auth = null;
            calendar = null;
        }
    };
    
    /**
     * Get authentication client based on DB-backed calendar method
     * @param {number} instructorId - Instructor ID
     * @returns {Promise<Auth>} Google Auth client
     */
    const getAuthClient = async (instructorId) => {
        const method = await getCalendarMethod();

        if (method === 'disabled') {
            return null;
        }

        if (method === 'oauth') {
            const googleOAuthService = require('../config/googleOAuth');
            const oauth2Client = await googleOAuthService.getAuthenticatedClient(instructorId);
            
            if (oauth2Client) {
                return oauth2Client;
            }
            
            // OAuth not configured for this instructor, try service account fallback
            if (!auth) {
                await initializeServiceAccount();
            }
        }

        if (method === 'service_account' && !auth) {
            await initializeServiceAccount();
        }
        
        return auth;
    };
    
    /**
     * Get calendar events for instructor within date range
     * @param {number} instructorId - Instructor ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Array} Array of calendar events in internal format
     */
    const getEvents = async (instructorId, startDate, endDate) => {
        const cacheKey = `${instructorId}-${startDate.toISOString()}-${endDate.toISOString()}`;
        
        // Check cache first
        const cached = cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < cacheTimeout) {
            return cached.data;
        }
        
        try {
            // Get calendar configuration for instructor
            const calendarConfig = await InstructorCalendarConfig.findByInstructorId(instructorId);
            if (!calendarConfig) {
                return [];
            }
            
            // Get authenticated client (OAuth or service account)
            const authClient = await getAuthClient(instructorId);

            if (!authClient) {
                // No authentication available for instructor
                return [];
            }

            // Create calendar API instance with authenticated client
            const calendarApi = google.calendar({ version: 'v3', auth: authClient });

            const response = await calendarApi.events.list({
                calendarId: calendarConfig.calendar_id || 'primary', // Use 'primary' for OAuth user's main calendar
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 250
            });
            const googleEvents = response.data.items || [];
            
            const convertedEvents = await convertToSlots(googleEvents, calendarConfig.all_day_event_handling);
            
            // Cache the results
            cache.set(cacheKey, {
                data: convertedEvents,
                timestamp: Date.now()
            });
            
            return convertedEvents;
            
        } catch (error) {
            // Gracefully handle OAuth errors (expired tokens, invalid grants)
            if (error.code === 400 || error.message?.includes('invalid_grant')) {
                console.warn(`Google Calendar OAuth error for instructor ${instructorId}: ${error.message || 'Token expired or revoked'}`);
            } else {
                console.error(`Google Calendar error for instructor ${instructorId}:`, error);
            }
            
            // Return cached data if available, otherwise empty array
            if (cached) {
                return cached.data;
            }
            
            return []; // Fail gracefully
        }
    };
    
    /**
     * Test calendar access for instructor
     * @param {number} instructorId - Instructor ID
     * @returns {Object} Test results
     */
    const testCalendarAccess = async (instructorId) => {
        try {
            const calendarConfig = await InstructorCalendarConfig.findByInstructorId(instructorId);
            if (!calendarConfig) {
                return {
                    success: false,
                    message: 'No calendar configuration found for this instructor'
                };
            }
            
            // Get authenticated client
            const authClient = await getAuthClient(instructorId);

            if (!authClient) {
                return {
                    success: false,
                    message: 'No authentication configured. Please connect via OAuth or configure service account.',
                    error: 'NO_AUTH'
                };
            }

            const calendarApi = google.calendar({ version: 'v3', auth: authClient });
            
            // Try to fetch a small number of events from today
            const todayHelper = today();
            const tomorrowHelper = todayHelper.addDays(1);
            
            const response = await calendarApi.events.list({
                calendarId: calendarConfig.calendar_id || 'primary',
                timeMin: todayHelper.toDate().toISOString(),
                timeMax: tomorrowHelper.toDate().toISOString(),
                maxResults: 5
            });
            
            const events = response.data.items || [];
            
            // Update test status in config
            await calendarConfig.updateTestStatus('success');
            
            return {
                success: true,
                message: 'Calendar connection working properly',
                eventsFound: events.length,
                calendarId: calendarConfig.calendar_id,
                calendarName: calendarConfig.calendar_name || calendarConfig.calendar_id
            };
            
        } catch (error) {
            console.error(`Calendar test failed for instructor ${instructorId}:`, error);
            
            // Update test status in config
            const calendarConfig = await InstructorCalendarConfig.findByInstructorId(instructorId);
            if (calendarConfig) {
                await calendarConfig.updateTestStatus('failed');
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
    };
    
    /**
     * Convert Google Calendar events to internal slot format
     * @param {Array} googleEvents - Google Calendar events
     * @param {string} allDayHandling - How to handle all-day events ('ignore', 'block')
     * @returns {Array} Converted events
     */
    const convertToSlots = async (googleEvents, allDayHandling = 'ignore') => {
        if (!Array.isArray(googleEvents)) {
            return [];
        }
        
        const convertedEvents = [];
        
        for (const event of googleEvents) {
            if (!event || !event.start || !event.end) {
                continue;
            }
            
            const isAllDayEvent = !event.start.dateTime; // All-day events only have 'date', not 'dateTime'
            
            // Handle all-day events based on configuration
            if (isAllDayEvent) {
                const allDayEvents = handleAllDayEvent(event, allDayHandling);
                convertedEvents.push(...allDayEvents);
                continue;
            }
            
            // Handle regular timed events
            const startTime = new Date(event.start.dateTime);
            const endTime = new Date(event.end.dateTime);
            
            const convertedEvent = {
                id: `google_${event.id}`,
                date: await getLocalDateString(startTime),
                start_slot: await timeToSlot(startTime),
                duration: await calculateDuration(startTime, endTime),
                type: 'booked', // Frontend expects 'type' field, not 'status'
                status: 'google_calendar_busy', // Keep for backend identification
                summary: event.summary || 'Busy',
                source: 'google_calendar',
                google_event_id: event.id,
                // Normalize student data to nested structure
                student: {
                    id: null,
                    name: event.summary || 'Busy',
                    email: 'Google Calendar'
                },
                is_google_calendar: true
            };
            
            convertedEvents.push(convertedEvent);
        }
        
        return convertedEvents.filter(event => event !== null); // Remove null entries (ignored all-day events)
    };
    
    /**
     * Handle all-day events based on configuration
     * @param {Object} event - Google Calendar event
     * @param {string} allDayHandling - How to handle all-day events ('ignore', 'block')
     * @returns {Array} Array of converted events (empty array if ignored)
     */
    const handleAllDayEvent = (event, allDayHandling) => {
        const eventDate = event.start.date; // All-day events use 'date' not 'dateTime'
        
        switch (allDayHandling) {
            case 'ignore':
                return []; // Return empty array
                
            case 'block':
                // Create events for the entire day (all 96 slots)
                return createAllDayBlockingEvents(event, eventDate);
                
            default:
                return []; // Default to ignore
        }
    };
    
    /**
     * Create blocking events for the entire day
     * @param {Object} event - Google Calendar event
     * @param {string} eventDate - Date string (YYYY-MM-DD)
     * @returns {Array} Array with single blocking event covering available hours
     */
    const createAllDayBlockingEvents = (event, eventDate) => {
        // Create a special all-day blocking event that the frontend can handle appropriately
        // Instead of blocking all 96 slots, let the frontend determine which slots to block
        // based on the instructor's actual availability for that day
        return [{
            id: `google_allday_${event.id}`,
            date: eventDate,
            start_slot: 0,  // Placeholder - frontend will handle appropriately
            duration: 0,    // Special marker for all-day events
            type: 'booked',
            status: 'google_calendar_all_day',
            summary: `All Day: ${event.summary || 'Busy'}`,
            source: 'google_calendar',
            google_event_id: event.id,
            student: {
                id: null,
                name: `All Day: ${event.summary || 'Busy'}`,
                email: 'Google Calendar'
            },
            is_google_calendar: true,
            is_all_day: true,
            // Special flag to indicate this should block all available slots for the day
            blocks_all_available_slots: true
        }];
    };
    
    /**
     * Get business timezone date string without timezone shifting
     * @param {Date} date - Date object
     * @returns {Promise<string>} Date string in YYYY-MM-DD format
     */
    const getLocalDateString = async (date) => {
        const { toBusinessDateString } = require('../utils/businessTimezone');
        return await toBusinessDateString(date);
    };
    
    /**
     * Convert time to slot number (30-minute increments) - Business timezone version
     * @param {Date} date - Date object (with timezone info from Google Calendar)
     * @returns {Promise<number>} Slot number (0-95) in business timezone, rounded up to next 30-min increment
     */
    const timeToSlot = async (date) => {
        // Use business timezone instead of server timezone
        const { toBusinessTimeString } = require('../utils/businessTimezone');
        const localTimeString = await toBusinessTimeString(date);
        
        // Parse the local time (format: "14:30")
        const [hours, minutes] = localTimeString.split(':').map(Number);
        
        // Round UP to next 30-minute increment for our slot system
        // This ensures Google Calendar events fit into our 30-minute UI slots
        let roundedMinutes;
        if (minutes === 0) {
            roundedMinutes = 0;  // Exactly on the hour
        } else if (minutes <= 30) {
            roundedMinutes = 30; // Round up to :30
        } else {
            roundedMinutes = 60; // Round up to next hour
        }
        
        const adjustedHours = roundedMinutes >= 60 ? hours + 1 : hours;
        const finalMinutes = roundedMinutes >= 60 ? 0 : roundedMinutes;
        
        // Convert to slot number - our slots are 15-min increments, but we use 30-min (duration=2)
        const MAX_SLOT_INDEX = 95;
        const slot = Math.floor(adjustedHours * 4 + finalMinutes / 15);
        
        // Ensure slot is within valid range
        return Math.max(0, Math.min(slot, MAX_SLOT_INDEX));
    };
    
    /**
     * Calculate duration between two times in slots - Business timezone version
     * Rounds up to cover all 30-minute slots that the event touches
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @returns {Promise<number>} Duration in slots (30-minute increments)
     */
    const calculateDuration = async (startTime, endTime) => {
        // Use business timezone instead of server timezone
        const { toBusinessTimeString } = require('../utils/businessTimezone');
        
        // Convert both times to business timezone
        const [startLocal, endLocal] = await Promise.all([
            toBusinessTimeString(startTime),
            toBusinessTimeString(endTime)
        ]);
        
        const [startHours, startMinutes] = startLocal.split(':').map(Number);
        const [endHours, endMinutes] = endLocal.split(':').map(Number);
        
        // Calculate which 30-minute slots are touched by this event
        
        // Start slot: round DOWN to the 30-minute slot that contains the start time
        let startSlotMinutes;
        if (startMinutes < 30) {
            startSlotMinutes = 0;   // 0-29 minutes -> :00 slot
        } else {
            startSlotMinutes = 30;  // 30-59 minutes -> :30 slot
        }
        
        // End slot: round UP to the 30-minute slot that contains the end time
        let endSlotHours = endHours;
        let endSlotMinutes;
        if (endMinutes === 0) {
            endSlotMinutes = 0;     // Exactly on the hour -> that hour's :00 slot
        } else if (endMinutes <= 30) {
            endSlotMinutes = 30;    // 1-30 minutes -> :30 slot
        } else {
            endSlotHours = endHours + 1;  // 31-59 minutes -> next hour's :00 slot
            endSlotMinutes = 0;
        }
        
        // Convert to total minutes for easy calculation
        const startTotalMinutes = startHours * 60 + startSlotMinutes;
        const endTotalMinutes = endSlotHours * 60 + endSlotMinutes;
        
        // Calculate duration in 30-minute increments
        const durationMinutes = endTotalMinutes - startTotalMinutes;
        const durationSlots = durationMinutes / 30;
        
        // Ensure minimum duration of 1 slot (30 minutes) and convert to our slot system (duration = 2 per 30-min)
        return Math.max(2, durationSlots * 2);
    };
    
    /**
     * Check if Google Calendar is available for instructor
     * @param {number} instructorId - Instructor ID
     * @returns {boolean} True if available
     */
    const isAvailableForInstructor = async (instructorId) => {
        try {
            const calendarConfig = await InstructorCalendarConfig.findByInstructorId(instructorId); 
            return !!calendarConfig && calendarConfig.is_active;
        } catch (error) {
            return false;
        }
    };
    
    /**
     * Get service account email for sharing instructions
     * @returns {Promise<string>} Service account email
     */
    const getServiceAccountEmail = async () => {
        const creds = await getServiceAccountCredentials();
        return creds.email || 'Service account email not configured';
    };
    
    /**
     * Clear cache for instructor
     * @param {number} instructorId - Instructor ID (optional)
     */
    const clearCache = (instructorId = null) => {
        if (instructorId) {
            // Clear cache entries for specific instructor
            for (const key of cache.keys()) {
                if (key.startsWith(`${instructorId}-`)) {
                    cache.delete(key);
                }
            }
        } else {
            // Clear all cache
            cache.clear();
        }
    };
    
    // Return service instance with all methods
    return {
        getEvents,
        testCalendarAccess,
        isAvailableForInstructor,
        getServiceAccountEmail,
        clearCache
    };
};

module.exports = createGoogleCalendarService; 