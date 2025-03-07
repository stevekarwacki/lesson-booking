const express = require('express');
const router = express.Router();
const InstructorAvailability = require('../models/InstructorAvailability');
const User = require('../models/User');
const Instructor = require('../models/Instructor');

// Get instructor's weekly availability
router.get('/:instructorId/weekly', async (req, res) => {
    try {
        const { instructorId } = req.params;
        const schedule = await InstructorAvailability.getWeeklyAvailability(instructorId);
        res.json(schedule);
    } catch (error) {
        console.error('Error fetching weekly availability:', error);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

// Update instructor's weekly availability
router.post('/:instructorId/weekly', async (req, res) => {
    try {
        const { instructorId } = req.params;
        const { slots } = req.body;

        // Validate input
        if (!Array.isArray(slots)) {
            return res.status(400).json({ 
                error: 'Slots must be an array' 
            });
        }

        // Validate each slot
        const isValidSlot = (slot) => {
            return typeof slot.dayOfWeek === 'number' 
                && slot.dayOfWeek >= 0 
                && slot.dayOfWeek <= 6
                && typeof slot.startSlot === 'number'
                && slot.startSlot >= 0
                && slot.startSlot <= 95
                && typeof slot.duration === 'number'
                && slot.duration > 0;
        };

        if (!slots.every(isValidSlot)) {
            return res.status(400).json({
                error: 'Invalid slot format',
                format: {
                    dayOfWeek: 'number (0-6)',
                    startSlot: 'number (0-95)',
                    duration: 'number (> 0)'
                }
            });
        }

        await InstructorAvailability.setWeeklyAvailability(instructorId, slots);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating weekly availability:', error);
        res.status(500).json({ error: 'Failed to update availability' });
    }
});

// Get instructor's blocked times
router.get('/:instructorId/blocked', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ 
                error: 'start_date and end_date query parameters are required' 
            });
        }

        const blockedTimes = await InstructorAvailability.getBlockedTimes(
            req.params.instructorId,
            start_date,
            end_date
        );
        res.json(blockedTimes);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching blocked times' });
    }
});

// Add a blocked time period
router.post('/:instructorId/blocked', async (req, res) => {
    try {
        const { startDateTime, endDateTime, reason } = req.body;
        
        if (!startDateTime || !endDateTime) {
            return res.status(400).json({ 
                error: 'startDateTime and endDateTime are required' 
            });
        }

        const blockedTimeId = await InstructorAvailability.addBlockedTime(
            req.params.instructorId,
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

// Remove a blocked time period
router.delete('/blocked/:blockedTimeId', async (req, res) => {
    try {
        await InstructorAvailability.removeBlockedTime(req.params.blockedTimeId);
        res.json({ message: 'Blocked time removed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error removing blocked time' });
    }
});

// Get instructor's availability for a specific date
router.get('/:instructorId/daily/:date', async (req, res) => {
    try {
        const { instructorId, date } = req.params;

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