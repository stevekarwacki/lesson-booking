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

        // 3. Check for existing one-time bookings
        const existingBookings = await Calendar.getInstructorEvents(instructorId);

        const hasOneTimeConflict = existingBookings.some(booking => {
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

        if (hasOneTimeConflict) {
            return res.status(400).json({ error: 'Time slot is already booked' });
        }

        // 4. Check for recurring booking conflicts
        const { RecurringBooking } = require('../models/RecurringBooking');
        const recurringBookings = await RecurringBooking.findByInstructorAndDay(instructorId, dayOfWeek);

        const hasRecurringConflict = recurringBookings.some(recurringBooking => {
            const recurringStart = recurringBooking.start_slot;
            const recurringEnd = recurringBooking.start_slot + recurringBooking.duration;

            return startSlot < recurringEnd && 
                   (startSlot + duration) > recurringStart;
        });

        if (hasRecurringConflict) {
            // Check if the current user owns this recurring booking
            const userOwnedRecurring = recurringBookings.find(rb => {
                const recurringStart = rb.start_slot;
                const recurringEnd = rb.start_slot + rb.duration;
                const hasTimeConflict = startSlot < recurringEnd && (startSlot + duration) > recurringStart;
                return hasTimeConflict && rb.Subscription && rb.Subscription.user_id === studentId;
            });

            if (!userOwnedRecurring) {
                return res.status(400).json({ error: 'Time slot is reserved for a recurring member' });
            }
        }

        // 5. Create the booking
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

// Get events for a date range (including recurring bookings)
router.get('/events/:instructorId/:startDate/:endDate', async (req, res) => {
    try {
        const { instructorId, startDate, endDate } = req.params
        
        // Get regular one-time bookings
        const events = await Calendar.getInstructorEvents(instructorId)
        
        // Filter events within date range
        const weekEvents = events.filter(event => {
            const eventDate = event.date
            return eventDate >= startDate && eventDate <= endDate
        })
        
        // Get recurring bookings and create virtual events for the date range
        const { RecurringBooking } = require('../models/RecurringBooking');
        const recurringBookings = await RecurringBooking.findAll({
            where: { instructor_id: instructorId },
            include: [
                {
                    model: require('../models/Subscription').Subscription,
                    where: { status: 'active' },
                    include: [{ model: require('../models/User').User }]
                }
            ]
        });
        
        // Create virtual events for each day in the range where recurring bookings apply
        const virtualEvents = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getUTCDay();
            const dateString = d.toISOString().split('T')[0];
            
            recurringBookings.forEach(rb => {
                if (rb.day_of_week === dayOfWeek) {
                    virtualEvents.push({
                        id: `recurring_${rb.id}_${dateString}`,
                        instructor_id: rb.instructor_id,
                        student_id: rb.Subscription.user_id,
                        date: dateString,
                        start_slot: rb.start_slot,
                        duration: rb.duration,
                        status: 'recurring_reserved',
                        student_name: rb.Subscription.User.name,
                        student_email: rb.Subscription.User.email,
                        recurring_booking_id: rb.id
                    });
                }
            });
        }
        
        // Combine regular events and virtual recurring events
        const allEvents = [...weekEvents, ...virtualEvents];
        
        res.json(allEvents)
    } catch (error) {
        console.error('Error fetching events:', error)
        res.status(500).json({ error: 'Error fetching events' })
    }
});

// Get daily events (including recurring bookings)
router.get('/dailyEvents/:instructorId/:date', async (req, res) => {
    try {
        const { instructorId, date } = req.params
        
        // Get regular one-time bookings
        const events = await Calendar.getInstructorEvents(instructorId)
        
        // Filter events for specific date
        const dayEvents = events.filter(event => event.date === date)
        
        // Get recurring bookings for this day of week
        const { RecurringBooking } = require('../models/RecurringBooking');
        const dayOfWeek = new Date(date).getUTCDay();
        const recurringBookings = await RecurringBooking.findByInstructorAndDay(instructorId, dayOfWeek);
        
        // Create virtual events for recurring bookings
        const virtualEvents = recurringBookings.map(rb => ({
            id: `recurring_${rb.id}_${date}`,
            instructor_id: rb.instructor_id,
            student_id: rb.Subscription.user_id,
            date: date,
            start_slot: rb.start_slot,
            duration: rb.duration,
            status: 'recurring_reserved',
            student_name: rb.Subscription.User.name,
            student_email: rb.Subscription.User.email,
            recurring_booking_id: rb.id
        }));
        
        // Combine regular events and virtual recurring events
        const allEvents = [...dayEvents, ...virtualEvents];
        
        res.json(allEvents)
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

        // Check for existing one-time bookings (excluding the current booking)
        const existingBookings = await Calendar.getInstructorEvents(booking.instructor_id);

        const hasOneTimeConflict = existingBookings.some(existingBooking => {
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

        if (hasOneTimeConflict) {
            return res.status(400).json({ error: 'Time slot is already booked' });
        }

        // Check for recurring booking conflicts
        const { RecurringBooking } = require('../models/RecurringBooking');
        const recurringBookings = await RecurringBooking.findByInstructorAndDay(booking.instructor_id, dayOfWeek);

        const hasRecurringConflict = recurringBookings.some(recurringBooking => {
            const recurringStart = recurringBooking.start_slot;
            const recurringEnd = recurringBooking.start_slot + recurringBooking.duration;

            return startSlot < recurringEnd && 
                   (startSlot + duration) > recurringStart;
        });

        if (hasRecurringConflict) {
            // Check if the current user owns this recurring booking
            const userOwnedRecurring = recurringBookings.find(rb => {
                const recurringStart = rb.start_slot;
                const recurringEnd = rb.start_slot + rb.duration;
                const hasTimeConflict = startSlot < recurringEnd && (startSlot + duration) > recurringStart;
                return hasTimeConflict && rb.Subscription && rb.Subscription.user_id === studentId;
            });

            if (!userOwnedRecurring) {
                return res.status(400).json({ error: 'Time slot is reserved for a recurring member' });
            }
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

// Get recurring bookings for an instructor in a date range  
router.get('/recurring/:instructorId/:startDate/:endDate', async (req, res) => {
    try {
        const { instructorId, startDate, endDate } = req.params;
        
        // Get active recurring bookings for this instructor
        const { RecurringBooking } = require('../models/RecurringBooking');
        const recurringBookings = await RecurringBooking.findAll({
            where: { instructor_id: instructorId },
            include: [
                {
                    model: require('../models/Subscription').Subscription,
                    where: { status: 'active' },
                    include: [{ model: require('../models/User').User }]
                }
            ]
        });
        
        // Create virtual events for each day in the range where recurring bookings apply
        const virtualEvents = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getUTCDay();
            const dateString = d.toISOString().split('T')[0];
            
            recurringBookings.forEach(rb => {
                if (rb.day_of_week === dayOfWeek) {
                    virtualEvents.push({
                        id: `recurring_${rb.id}_${dateString}`,
                        instructor_id: rb.instructor_id,
                        student_id: rb.Subscription.user_id,
                        date: dateString,
                        start_slot: rb.start_slot,
                        duration: rb.duration,
                        status: 'recurring_reserved',
                        student_name: rb.Subscription.User.name,
                        student_email: rb.Subscription.User.email,
                        recurring_booking_id: rb.id,
                        subscription_id: rb.subscription_id
                    });
                }
            });
        }
        
        res.json(virtualEvents);
    } catch (error) {
        console.error('Error fetching recurring bookings:', error);
        res.status(500).json({ error: 'Error fetching recurring bookings' });
    }
});

module.exports = router; 