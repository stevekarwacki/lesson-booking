const express = require('express');
const router = express.Router();
const InstructorAvailability = require('../models/InstructorAvailability');
const { AppSettings } = require('../models/AppSettings');
const instructorAuth = require('../middleware/instructorAuth');
const { createLocalAvailabilityRecord, validateSlotAgainstBusinessHours } = require('../utils/timeUtils');
const { authorize, authorizeResource } = require('../middleware/permissions');

// Get instructor's weekly availability
router.get('/:instructorId/weekly', async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
        const { timezone } = req.query; // Client can specify timezone
        
        const schedule = await InstructorAvailability.getWeeklyAvailability(instructorId);
        
        // If timezone is provided and not UTC, convert UTC slots to local time for display
        if (timezone && timezone !== 'UTC') {
            // Note: Since weekly availability uses day_of_week + slots, 
            // the conversion is already handled by the slot system.
            // The slots represent times within each day of the week,
            // so they remain consistent regardless of timezone.
            // The client will handle the display conversion.
        }
        
        res.json(schedule);
    } catch (error) {
        console.error('Error fetching weekly availability:', error);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

// Update instructor's weekly availability - instructor or admin
router.post('/:instructorId/weekly', authorize('update', 'InstructorAvailability'), async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
        const { slots, instructorTimezone } = req.body;

        // Validate input
        if (!Array.isArray(slots)) {
            return res.status(400).json({ 
                error: 'Slots must be an array' 
            });
        }

        if (!instructorTimezone) {
            return res.status(400).json({
                error: 'Instructor timezone is required'
            });
        }

        // Updated validation for timezone-aware slots
        const isValidSlotData = (slot) => {
            return typeof slot.dayOfWeek === 'number' 
                && slot.dayOfWeek >= 0 
                && slot.dayOfWeek <= 6
                && typeof slot.startTime === 'string'
                && typeof slot.endTime === 'string'
                && slot.startTime.match(/^\d{2}:\d{2}$/)
                && slot.endTime.match(/^\d{2}:\d{2}$/);
        };

        if (!slots.every(isValidSlotData)) {
            return res.status(400).json({
                error: 'Invalid slot format',
                format: {
                    dayOfWeek: 'number (0-6)',
                    startTime: 'string (HH:MM)',
                    endTime: 'string (HH:MM)'
                }
            });
        }

        // Validate slots against business hours
        const businessHours = await AppSettings.getBusinessHours();
        
        for (const slot of slots) {
            const validation = validateSlotAgainstBusinessHours(
                slot.dayOfWeek,
                slot.startTime,
                slot.endTime,
                businessHours
            );
            
            if (!validation.valid) {
                return res.status(400).json({
                    error: validation.error,
                    businessHours: validation.dayConfig ? { 
                        open: validation.dayConfig.open, 
                        close: validation.dayConfig.close 
                    } : undefined,
                    requestedSlot: { 
                        dayOfWeek: slot.dayOfWeek, 
                        startTime: slot.startTime, 
                        endTime: slot.endTime 
                    }
                });
            }
        }

        // Convert timezone-aware slots to database records
        const availabilityRecords = [];
        for (const slot of slots) {
            try {
                const record = createLocalAvailabilityRecord(
                    slot.startTime,
                    slot.endTime,
                    slot.dayOfWeek,
                    instructorTimezone
                );
                record.instructor_id = instructorId;
                availabilityRecords.push(record);
            } catch (error) {
                return res.status(400).json({
                    error: `Invalid time range: ${slot.startTime} to ${slot.endTime} on day ${slot.dayOfWeek}`,
                    details: error.message
                });
            }
        }

        await InstructorAvailability.setWeeklyAvailability(instructorId, availabilityRecords);
        res.json({ 
            success: true,
            message: `Updated availability for ${availabilityRecords.length} time slots`
        });
    } catch (error) {
        console.error('Error updating weekly availability:', error);
        res.status(500).json({ error: 'Failed to update availability' });
    }
});

// Get instructor's blocked times
router.get('/:instructorId/blocked', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const instructorId = parseInt(req.params.instructorId, 10);
        
        if (!start_date || !end_date) {
            return res.status(400).json({ 
                error: 'start_date and end_date query parameters are required' 
            });
        }

        const blockedTimes = await InstructorAvailability.getBlockedTimes(
            instructorId,
            start_date,
            end_date
        );
        res.json(blockedTimes);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching blocked times' });
    }
});

// Add a blocked time period - instructor or admin
router.post('/:instructorId/blocked', authorize('update', 'InstructorAvailability'), async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
        const { startDateTime, endDateTime, reason } = req.body;
        
        if (!startDateTime || !endDateTime) {
            return res.status(400).json({ 
                error: 'startDateTime and endDateTime are required' 
            });
        }

        const blockedTimeId = await InstructorAvailability.addBlockedTime(
            instructorId,
            { startDateTime, endDateTime, reason }
        );
        res.status(201).json({ 
            message: 'Blocked time added successfully',
            blockedTimeId 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error adding blocked time' });
    }
});

// Remove a blocked time period - instructor or admin
router.delete('/blocked/:blockedTimeId', authorizeResource('delete', 'InstructorAvailability', async (req) => {
    const blockedTime = await InstructorAvailability.getBlockedTime(parseInt(req.params.blockedTimeId));
    return { instructor_id: blockedTime?.instructor_id };
}), async (req, res) => {
    try {
        const blockedTimeId = parseInt(req.params.blockedTimeId, 10);
        const blockedTime = await InstructorAvailability.getBlockedTime(blockedTimeId);
        if (!blockedTime) {
            return res.status(404).json({ error: 'Blocked time not found' });
        }

        // CASL middleware already verified permissions

        await InstructorAvailability.removeBlockedTime(blockedTimeId);
        res.json({ message: 'Blocked time removed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error removing blocked time' });
    }
});

// Get instructor's availability for a specific date
router.get('/:instructorId/daily/:date', async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
        const { date } = req.params;

        // Create date object in local timezone and get day of week
        const localDate = new Date(date);
        const utcDay = localDate.getUTCDay();
        
        // Get weekly schedule for this day
        const schedule = await InstructorAvailability.getWeeklyAvailability(instructorId);
        const daySchedule = schedule.filter(slot => slot.day_of_week === utcDay);

        res.json(daySchedule);
    } catch (error) {
        console.error('Error fetching daily availability:', error);
        res.status(500).json({ error: 'Error fetching daily availability' });
    }
});

module.exports = router; 