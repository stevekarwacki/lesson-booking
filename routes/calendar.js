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
        const { instructorId, startTime, endTime } = req.body;
        const studentId = req.headers['user-id'];

        // 1. Calculate slots using UTC time
        const requestedDate = new Date(startTime);
        const dayOfWeek = requestedDate.getUTCDay();
        const startSlot = Math.floor(requestedDate.getUTCHours() * 4 + requestedDate.getUTCMinutes() / 15);
        const endSlot = Math.floor(new Date(endTime).getUTCHours() * 4 + new Date(endTime).getUTCMinutes() / 15);
        const duration = endSlot - startSlot;

        // 2. Get availability
        const weeklyAvailability = await InstructorAvailability.getWeeklyAvailability(instructorId);

        // 3. Debug log after we have the data
        console.log('Debug booking request:', {
            dayOfWeek,
            startSlot,
            endSlot,
            duration,
            requestedDate: requestedDate.toString(),
            weeklyAvailability
        });

        const isTimeInWeeklySchedule = weeklyAvailability.some(slot => {
            if (slot.day_of_week !== dayOfWeek) return false;
            const slotEnd = slot.start_slot + slot.duration;
            console.log('Checking slot:', {
                slot,
                slotEnd,
                isValid: startSlot >= slot.start_slot && 
                         startSlot < slotEnd && 
                         (startSlot + duration) <= slotEnd
            });
            return startSlot >= slot.start_slot && 
                   startSlot < slotEnd && 
                   (startSlot + duration) <= slotEnd;
        });

        if (!isTimeInWeeklySchedule) {
            return res.status(400).json({ 
                error: 'Selected time is outside instructor\'s availability'
            });
        }

        // 4. Check for existing bookings
        const existingBookings = await Calendar.getInstructorEvents(instructorId);

        const hasConflict = existingBookings.some(booking => {
            const bookingStart = booking.start_slot;
            const bookingEnd = booking.start_slot + booking.duration;
            return booking.status === 'booked' && 
                   startSlot < bookingEnd && 
                   (startSlot + duration) > bookingStart;
        });

        if (hasConflict) {
            return res.status(400).json({ error: 'Time slot is already booked' });
        }

        // 5. Create the booking
        const bookingId = await Calendar.addEvent(
            instructorId,
            studentId,
            requestedDate.toISOString().split('T')[0],
            startSlot,
            duration
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