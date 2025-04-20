const express = require('express');
const router = express.Router();
const InstructorAvailability = require('../models/InstructorAvailability');
const instructorAuth = require('../middleware/instructorAuth');

// Get instructor's weekly availability
router.get('/:instructorId/weekly', async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
        const schedule = await InstructorAvailability.getWeeklyAvailability(instructorId);
        res.json(schedule);
    } catch (error) {
        console.error('Error fetching weekly availability:', error);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

// Update instructor's weekly availability
router.post('/:instructorId/weekly', instructorAuth, async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
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

// Add a blocked time period
router.post('/:instructorId/blocked', instructorAuth, async (req, res) => {
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

// Remove a blocked time period
router.delete('/blocked/:blockedTimeId', instructorAuth, async (req, res) => {
    try {
        const blockedTimeId = parseInt(req.params.blockedTimeId, 10);
        const blockedTime = await InstructorAvailability.getBlockedTime(blockedTimeId);
        if (!blockedTime) {
            return res.status(404).json({ error: 'Blocked time not found' });
        }

        // Verify the blocked time belongs to the instructor
        if (blockedTime.instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

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