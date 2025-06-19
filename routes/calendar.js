const express = require('express');
const router = express.Router();
const { Calendar } = require('../models/Calendar');
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
        if (req.user.role !== 'instructor') {
            return res.status(403).json({ error: 'Access denied. Instructor only.' });
        }

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
        if (req.user.role !== 'instructor') {
            return res.status(403).json({ error: 'Access denied. Instructor only.' });
        }

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
        const studentId = req.user.id;

        // Validate required fields
        if (!instructorId || !startTime || !endTime) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate and parse dates
        const requestedDate = new Date(startTime);
        const endDate = new Date(endTime);

        // Check if dates are valid
        if (isNaN(requestedDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }

        // Format date to YYYY-MM-DD
        const formattedDate = requestedDate.toISOString().split('T')[0];
        const dayOfWeek = requestedDate.getUTCDay();

        // Calculate time slots
        const startSlot = Math.floor(requestedDate.getUTCHours() * 4 + requestedDate.getUTCMinutes() / 15);
        const endSlot = Math.floor(endDate.getUTCHours() * 4 + endDate.getUTCMinutes() / 15);
        const duration = endSlot - startSlot;

        // Validate slot duration
        if (duration <= 0) {
            return res.status(400).json({ error: 'Invalid time slot duration' });
        }

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
        const event = await Calendar.addEvent(
            instructorId,
            studentId,
            formattedDate,
            startSlot,
            duration,
            'booked',
            paymentMethod
        );

        // Get the newly created booking data
        const newBooking = await Calendar.getEventById(event.id);

        res.status(201).json({
            message: 'Lesson booked successfully',
            bookingId: event.id,
            booking: newBooking
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

// Get events for a date range
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

// Get daily events
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

// Get student bookings
router.get('/student/:studentId', async (req, res) => {
    try {
        // Convert studentId to number for comparison
        const studentId = parseInt(req.params.studentId, 10);
        
        // Ensure user can only access their own bookings
        if (req.user.id !== studentId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const events = await Calendar.getStudentEvents(studentId);
        res.json(events);
    } catch (error) {
        console.error('Error fetching student bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Update student booking
router.patch('/student/:bookingId', async (req, res) => {
    try {
        const bookingId = parseInt(req.params.bookingId, 10);
        const { startTime, endTime } = req.body;
        const studentId = req.user.id;

        // Validate required fields
        if (!startTime || !endTime) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate and parse dates
        const requestedDate = new Date(startTime);
        const endDate = new Date(endTime);

        // Check if dates are valid
        if (isNaN(requestedDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }

        // Format date to YYYY-MM-DD
        const formattedDate = requestedDate.toISOString().split('T')[0];
        const dayOfWeek = requestedDate.getUTCDay();

        // Calculate time slots
        const startSlot = Math.floor(requestedDate.getUTCHours() * 4 + requestedDate.getUTCMinutes() / 15);
        const endSlot = Math.floor(endDate.getUTCHours() * 4 + endDate.getUTCMinutes() / 15);
        const duration = endSlot - startSlot;

        // Validate slot duration
        if (duration <= 0) {
            return res.status(400).json({ error: 'Invalid time slot duration' });
        }

        // Get the booking to update
        const booking = await Calendar.findByPk(bookingId);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Verify the booking belongs to the student
        if (booking.student_id !== studentId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get instructor availability
        const weeklyAvailability = await InstructorAvailability.getWeeklyAvailability(booking.instructor_id);

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

        // Check for existing bookings (excluding the current booking)
        const existingBookings = await Calendar.getInstructorEvents(booking.instructor_id);

        const hasConflict = existingBookings.some(existingBooking => {
            // Skip the booking being updated
            if (existingBooking.id === bookingId) return false;

            // First check if this booking is for the same day
            if (existingBooking.date !== formattedDate) {
                return false;
            }

            // If it's the same day, check for time slot conflicts
            const bookingStart = existingBooking.start_slot;
            const bookingEnd = existingBooking.start_slot + existingBooking.duration;

            return startSlot < bookingEnd && 
                   (startSlot + duration) > bookingStart;
        });

        if (hasConflict) {
            return res.status(400).json({ error: 'Time slot is already booked' });
        }

        // Update the booking
        await booking.update({
            date: formattedDate,
            start_slot: startSlot,
            duration: duration
        });

        res.json({
            message: 'Booking updated successfully',
            booking
        });

    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ 
            error: 'Failed to update booking',
            details: error.message 
        });
    }
});

module.exports = router; 