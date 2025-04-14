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
router.post('/addEvent', async (req, res) => {
    try {
        const { instructorId, startTime, endTime, paymentMethod = 'credits' } = req.body;
        const studentId = req.headers['user-id'];

        // 1. Calculate slots using UTC time
        const requestedDate = new Date(startTime);
        const formattedDate = requestedDate.toISOString().split('T')[0]
        const dayOfWeek = requestedDate.getUTCDay();
        const startSlot = Math.floor(requestedDate.getUTCHours() * 4 + requestedDate.getUTCMinutes() / 15);
        const endSlot = Math.floor(new Date(endTime).getUTCHours() * 4 + new Date(endTime).getUTCMinutes() / 15);
        const duration = endSlot - startSlot;

        // 2. Get availability
        const weeklyAvailability = await InstructorAvailability.getWeeklyAvailability(instructorId);

        const isTimeInWeeklySchedule = weeklyAvailability.some(slot => {
            if (slot.day_of_week !== dayOfWeek) return false;
            const slotEnd = slot.start_slot + slot.duration;
            return startSlot >= slot.start_slot && 
                   startSlot < slotEnd && 
                   (startSlot + duration) <= slotEnd;
        });

        if (!isTimeInWeeklySchedule) {
            return res.status(400).json({ 
                error: 'Selected time is outside instructor\'s availability'
            });
        }

        // 3. Check for existing bookings
        const existingBookings = await Calendar.getInstructorEvents(instructorId);

        const hasConflict = existingBookings.some(booking => {
            // First check if this booking is for the same day
            if (booking.date !== formattedDate) {
                return false
            }

            // If it's the same day, check for time slot conflicts
            const bookingStart = booking.start_slot
            const bookingEnd = booking.start_slot + booking.duration

            return startSlot < bookingEnd && 
                   (startSlot + duration) > bookingStart
        });

        if (hasConflict) {
            return res.status(400).json({ error: 'Time slot is already booked' });
        }

        // 4. Create the booking
        const bookingId = await Calendar.addEvent(
            instructorId,
            studentId,
            formattedDate,
            startSlot,
            duration,
            'booked',
            paymentMethod
        );

        res.status(201).json({
            message: 'Lesson booked successfully',
            bookingId
        });

    } catch (error) {
        console.error('Detailed error in booking lesson:', error);
        if (error.message === 'INSUFFICIENT_CREDITS') {
            return res.status(400).json({ error: 'INSUFFICIENT_CREDITS' });
        }
        res.status(500).json({ 
            error: 'Failed to book lesson',
            details: error.message 
        });
    }
});

router.get('/events/:instructorId/:startDate/:endDate', async (req, res) => {
    try {
        const { instructorId, startDate, endDate } = req.params
        const events = await Calendar.getInstructorEvents(instructorId)
        
        // Filter events within date range
        const weekEvents = events.filter(event => {
            const eventDate = event.date
            return eventDate >= startDate && eventDate <= endDate
        })
        
        res.json(weekEvents)
    } catch (error) {
        console.error('Error fetching events:', error)
        res.status(500).json({ error: 'Error fetching events' })
    }
});

router.get('/dailyEvents/:instructorId/:date', async (req, res) => {
    try {
        const { instructorId, date } = req.params
        const events = await Calendar.getInstructorEvents(instructorId)
        
        // Filter events for specific date
        const dayEvents = events.filter(event => event.date === date)
        
        res.json(dayEvents)
    } catch (error) {
        console.error('Error fetching daily events:', error)
        res.status(500).json({ error: 'Error fetching events' })
    }
});

module.exports = router; 