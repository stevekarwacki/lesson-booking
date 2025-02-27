const express = require('express');
const router = express.Router();
const Calendar = require('../models/Calendar');
const InstructorAvailability = require('../models/InstructorAvailability');

// Get instructor's calendar events
router.get('/instructor/:instructorId', async (req, res) => {
    try {
        const events = await Calendar.getInstructorEvents(req.params.instructorId);
        res.json(events);
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({ error: 'Error fetching calendar events' });
    }
});

// Create new calendar event (instructor only)
router.post('/', async (req, res) => {
    try {
        const eventId = await Calendar.createEvent(req.body);
        res.status(201).json({ 
            message: 'Event created successfully',
            eventId 
        });
    } catch (error) {
        console.error('Error creating calendar event:', error);
        res.status(500).json({ error: 'Error creating calendar event' });
    }
});

// Update calendar event (instructor only)
router.patch('/:eventId', async (req, res) => {
    try {
        await Calendar.updateEvent(req.params.eventId, req.body);
        res.json({ message: 'Event updated successfully' });
    } catch (error) {
        console.error('Error updating calendar event:', error);
        res.status(500).json({ error: 'Error updating calendar event' });
    }
});

// Delete calendar event (instructor only)
router.delete('/:eventId', async (req, res) => {
    try {
        await Calendar.deleteEvent(req.params.eventId);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting calendar event:', error);
        res.status(500).json({ error: 'Error deleting calendar event' });
    }
});

// Book a lesson
router.post('/book', async (req, res) => {
    try {
        const { instructorId, startTime, endTime } = req.body;
        const studentId = req.headers['user-id'];

        // 1. Check if the time slot falls within instructor's weekly availability
        const date = new Date(startTime);
        const dayOfWeek = date.getDay();
        
        
        const weeklyAvailability = await InstructorAvailability.getWeeklyAvailability(instructorId);

        const isTimeInWeeklySchedule = weeklyAvailability.some(slot => {
            if (slot.day_of_week !== dayOfWeek) return false;
            
            const slotStart = new Date(`${date.toISOString().split('T')[0]}T${slot.start_time}`);
            const slotEnd = new Date(`${date.toISOString().split('T')[0]}T${slot.end_time}`);
            
            return date >= slotStart && new Date(endTime) <= slotEnd;
        });

        if (!isTimeInWeeklySchedule) {
            return res.status(400).json({ error: 'Selected time is outside instructor\'s availability' });
        }

        // 2. Check for any blocked times
        const blockedTimes = await InstructorAvailability.getBlockedTimes(
            instructorId,
            startTime,
            endTime
        );

        if (blockedTimes.length > 0) {
            return res.status(400).json({ error: 'Selected time slot is blocked' });
        }

        /*
        // 3. Check for existing bookings
        const existingBookings = await Calendar.getEvents(
            instructorId,
            startTime,
            endTime
        );

        const hasConflict = existingBookings.some(booking => 
            booking.status === 'booked' && 
            new Date(startTime) < new Date(booking.end_time) && 
            new Date(endTime) > new Date(booking.start_time)
        );

        if (hasConflict) {
            return res.status(400).json({ error: 'Time slot is already booked' });
        }
        */

        // 4. Create the booking
        const bookingId = await Calendar.bookLesson(
            instructorId,
            studentId,
            startTime,
            endTime
        );

        res.status(201).json({
            message: 'Lesson booked successfully',
            bookingId
        });

    } catch (error) {
        console.error('Detailed error in booking lesson:', error);
        res.status(500).json({ 
            error: 'Failed to book lesson',
            details: error.message 
        });
    }
});

module.exports = router; 