const express = require('express');
const router = express.Router();
const { InstructorAvailability } = require('../models/InstructorAvailability');
const User = require('../models/User');
const Instructor = require('../models/Instructor');

// Get instructor's weekly schedule
router.get('/:instructorId/weekly', async (req, res) => {
    try {
        const instructorId = req.params.instructorId;
        const userId = req.headers['user-id'];

        // Get the user and their instructor info if they are an instructor
        const user = await User.findById(userId);
        const instructor = await Instructor.findByUserId(userId);

        // Allow access if user is the instructor (comparing instructor IDs) or an admin
        if ((instructor && instructor.id.toString() === instructorId.toString()) || user.role === 'admin') {
            const schedule = await InstructorAvailability.getWeeklyAvailability(instructorId);
            res.json(schedule || []);
        } else {
            res.status(403).json({ error: 'Unauthorized to view this schedule' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error fetching weekly schedule' });
    }
});

// Set instructor's weekly schedule
router.post('/:instructorId/weekly', async (req, res) => {
    try {
        const schedules = req.body;
        const instructorId = req.params.instructorId;
        const userId = req.headers['user-id'];

        // Get the user and their instructor info if they are an instructor
        const user = await User.findById(userId);
        const instructor = await Instructor.findByUserId(userId);

        // Allow access if user is the instructor (comparing instructor IDs) or an admin
        if ((instructor && instructor.id.toString() === instructorId.toString()) || user.role === 'admin') {
            await InstructorAvailability.setWeeklyAvailability(instructorId, schedules);
            res.json({ message: 'Weekly schedule updated successfully' });
        } else {
            res.status(403).json({ error: 'Unauthorized to modify this schedule' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error updating weekly schedule' });
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

module.exports = router; 