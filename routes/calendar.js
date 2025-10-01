const express = require('express');
const router = express.Router();
const { Calendar } = require('../models/Calendar');
const { Attendance } = require('../models/Attendance');
const InstructorAvailability = require('../models/InstructorAvailability');
const GoogleCalendarService = require('../services/GoogleCalendarService');
const { authorize, authorizeBooking, authorizeUserAccess } = require('../middleware/permissions');
const emailQueueService = require('../services/EmailQueueService');
const emailService = require('../services/EmailService');
const { 
    timeToSlotUTC,
    formatDateUTC,
    getDayOfWeekUTC,
    calculateDurationInSlots,
    isValidSlot,
    isBookingAvailable,
    slotToTime
} = require('../utils/timeUtils');

// Get instructor's calendar events - requires read permission for instructor data
router.get('/instructor/:instructorId', authorize('read', 'Instructor'), async (req, res) => {
    try {
        const events = await Calendar.getInstructorEvents(req.params.instructorId);
        res.json(events);
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({ error: 'Error fetching calendar events' });
    }
});

// Update calendar event (instructor only)
router.patch('/:eventId', authorizeBooking('update', async (req) => {
    return await Calendar.getEventById(req.params.eventId);
}), async (req, res) => {
    try {
        // CASL middleware already verified permissions

        await Calendar.updateEvent(req.params.eventId, req.body);
        res.json({ message: 'Event updated successfully' });
    } catch (error) {
        console.error('Error updating calendar event:', error);
        res.status(500).json({ error: 'Error updating calendar event' });
    }
});

// Delete calendar event (instructor only)
router.delete('/:eventId', authorizeBooking('cancel', async (req) => {
    return await Calendar.getEventById(req.params.eventId);
}), async (req, res) => {
    try {
        // CASL middleware already verified permissions

        await Calendar.deleteEvent(req.params.eventId);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting calendar event:', error);
        res.status(500).json({ error: 'Error deleting calendar event' });
    }
});

// Mark or update attendance for a lesson
router.post('/attendance', authorizeBooking('update', async (req) => {
    return await Calendar.getEventById(req.body.eventId);
}), async (req, res) => {
    try {
        const { eventId, status, notes } = req.body;

        // Validate required fields
        if (!eventId) {
            return res.status(400).json({ error: 'Event ID is required' });
        }

        // Validate status if provided
        if (status && !['present', 'absent', 'tardy'].includes(status)) {
            return res.status(400).json({ error: 'Invalid attendance status. Must be present, absent, or tardy.' });
        }

        // Get the calendar event to check lesson timing
        const event = await Calendar.getEventById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Calendar event not found' });
        }

        // Check if lesson has started (attendance can only be marked after lesson start time)
        const lessonDate = new Date(event.date);
        const lessonStartTime = slotToTime(event.start_slot);
        const [hours, minutes] = lessonStartTime.split(':');
        lessonDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const now = new Date();
        if (now < lessonDate) {
            return res.status(400).json({ 
                error: 'Attendance can only be marked after the lesson has started',
                lessonStartTime: lessonDate.toISOString()
            });
        }

        // Mark attendance using the model method
        const result = await Attendance.markAttendance(eventId, status, notes);

        // Send absence notification email if student is marked absent
        if (status === 'absent') {
            try {
                // Get full event details with student and instructor info for email
                const fullEvent = await Calendar.getEventById(eventId);
                if (fullEvent && fullEvent.student && fullEvent.student.email) {
                    await emailService.sendAbsenceNotification(fullEvent, notes || '');
                }
            } catch (emailError) {
                // Don't fail the attendance marking if email fails
                console.error('Failed to send absence notification email:', emailError);
            }
        }

        res.json({
            success: true,
            message: result.created ? 'Attendance recorded successfully' : 'Attendance updated successfully',
            attendance: {
                status: result.attendance.status,
                notes: result.attendance.notes,
                recorded_at: result.attendance.updated_at
            }
        });

    } catch (error) {
        console.error('Error marking attendance:', error);
        
        // Handle specific error messages
        if (error.message.includes('Invalid attendance status')) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Error marking attendance' });
    }
});

// Book a lesson
router.post('/addEvent', authorize('create', 'Booking'), async (req, res) => {
    try {
        const { instructorId, startTime, endTime, paymentMethod = 'credits' } = req.body;
        const studentId = req.user.id;

        // Validate required fields
        if (!instructorId || !startTime || !endTime) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate and parse dates using UTC utilities
        const requestedDate = new Date(startTime);
        const endDate = new Date(endTime);

        // Check if dates are valid
        if (isNaN(requestedDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }

        // Format date to YYYY-MM-DD using UTC utilities
        const formattedDate = formatDateUTC(requestedDate);
        const dayOfWeek = getDayOfWeekUTC(requestedDate);

        // Calculate time slots using UTC utilities
        const startSlot = timeToSlotUTC(requestedDate);
        const endSlot = timeToSlotUTC(endDate);
        const duration = calculateDurationInSlots(requestedDate, endDate);

        // Validate slots
        if (!isValidSlot(startSlot) || !isValidSlot(endSlot)) {
            return res.status(400).json({ error: 'Invalid time slots' });
        }

        // Validate slot duration
        if (duration <= 0) {
            return res.status(400).json({ error: 'Invalid time slot duration' });
        }

        // 2. Get availability and validate using timezone-aware checking
        const weeklyAvailability = await InstructorAvailability.getWeeklyAvailability(instructorId);

        // Check if instructor has any availability for this day
        const dayAvailability = weeklyAvailability.filter(slot => slot.day_of_week === dayOfWeek);
        
        if (dayAvailability.length === 0) {
            return res.status(400).json({ 
                error: 'Instructor has no availability on this day' 
            });
        }

        // Use timezone-aware availability checking
        // For now, assume student timezone from request or default to UTC
        const studentTimezone = req.body.studentTimezone || 'UTC';
        const bookingTime = requestedDate.toISOString().substring(11, 16); // Extract HH:MM
        const bookingDate = formattedDate;

        // Check each availability slot for this day
        let isAvailable = false;
        let availabilityDetails = null;

        for (const availSlot of dayAvailability) {
            if (isBookingAvailable(bookingTime, bookingDate, studentTimezone, availSlot)) {
                // Additional check: ensure the full duration fits
                const endTime = new Date(requestedDate.getTime() + (duration * 15 * 60 * 1000));
                const endTimeStr = endTime.toISOString().substring(11, 16);
                
                if (isBookingAvailable(endTimeStr, bookingDate, studentTimezone, availSlot)) {
                    isAvailable = true;
                    availabilityDetails = availSlot;
                    break;
                }
            }
        }

        if (!isAvailable) {
            const errorMessage = duration > 2 
                ? `Instructor is not available for the full ${duration * 15} minutes requested. Please check availability or select a shorter duration.`
                : 'Selected time is outside instructor\'s availability';
            
            return res.status(400).json({ error: errorMessage });
        }

        // 3. Check for existing one-time bookings
        const existingBookings = await Calendar.getInstructorEvents(instructorId);

        // Check for existing one-time booking conflicts with detailed logging
        const conflictingBookings = existingBookings.filter(booking => {
            // First check if this booking is for the same day
            if (booking.date !== formattedDate) {
                return false;
            }

            // If it's the same day, check for time slot conflicts
            const bookingStart = booking.start_slot;
            const bookingEnd = booking.start_slot + booking.duration;

            return startSlot < bookingEnd && 
                   (startSlot + duration) > bookingStart;
        });

        if (conflictingBookings.length > 0) {
            const errorMessage = duration > 2 
                ? 'The requested 60-minute time slot conflicts with existing bookings. Please select a different time or try a 30-minute lesson.'
                : 'Time slot is already booked';
                
            return res.status(400).json({ error: errorMessage });
        }

        // 4. Check for recurring booking conflicts
        const { RecurringBooking } = require('../models/RecurringBooking');
        const recurringBookings = await RecurringBooking.findByInstructorAndDay(instructorId, dayOfWeek);

        // Check for recurring booking conflicts with detailed logging
        const conflictingRecurringBookings = recurringBookings.filter(recurringBooking => {
            const recurringStart = recurringBooking.start_slot;
            const recurringEnd = recurringBooking.start_slot + recurringBooking.duration;

            return startSlot < recurringEnd && 
                   (startSlot + duration) > recurringStart;
        });

        if (conflictingRecurringBookings.length > 0) {
            // Check if the current user owns this recurring booking
            const userOwnedRecurring = conflictingRecurringBookings.find(rb => {
                const recurringStart = rb.start_slot;
                const recurringEnd = rb.start_slot + rb.duration;
                const hasTimeConflict = startSlot < recurringEnd && (startSlot + duration) > recurringStart;
                return hasTimeConflict && rb.Subscription && rb.Subscription.user_id === studentId;
            });

            if (!userOwnedRecurring) {
                const errorMessage = duration > 2 
                    ? 'The requested 60-minute time slot conflicts with a recurring lesson. Please select a different time or try a 30-minute lesson.'
                    : 'Time slot is reserved for a recurring member';
                    
                return res.status(400).json({ error: errorMessage });
            }
        }

        // 5. Create the booking with transaction safety
        let event;
        try {
            event = await Calendar.addEvent(
                instructorId,
                studentId,
                formattedDate,
                startSlot,
                duration,
                'booked',
                paymentMethod
            );
        } catch (bookingError) {
            // If booking fails and this was a direct payment, we need to refund the Stripe payment
            if (paymentMethod === 'direct') {
                // TODO: Implement automatic Stripe refund here
                // This would require storing the payment intent ID and calling Stripe's refund API
                // For now, log the error so manual refunds can be processed
                console.error('CRITICAL: Booking failed after Stripe payment. Manual refund required.', {
                    studentId,
                    instructorId,
                    startTime,
                    endTime,
                    error: bookingError.message,
                    timestamp: new Date().toISOString()
                });
            }
            throw bookingError;
        }

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
                        // Normalize student data to nested structure
                        student: {
                            id: rb.Subscription.user_id,
                            name: rb.Subscription.User.name,
                            email: rb.Subscription.User.email
                        },
                        recurring_booking_id: rb.id
                    });
                }
            });
        }
        
        // Get Google Calendar events with bulletproof error handling
        let googleEvents = [];
        
        try {
            // Try to create service instance - this might fail synchronously
            let googleCalendarService;
            try {
                googleCalendarService = new GoogleCalendarService();

            } catch (serviceError) {

                googleEvents = [];
                // Skip Google Calendar entirely if service creation fails
            }
            
            if (googleCalendarService) {
                try {

                    const isAvailable = await googleCalendarService.isAvailableForInstructor(instructorId);

                    
                    if (isAvailable) {

                        const startDateObj = new Date(startDate);
                        const endDateObj = new Date(endDate);
                        endDateObj.setDate(endDateObj.getDate() + 1);
                        
                        const events = await googleCalendarService.getEvents(instructorId, startDateObj, endDateObj);

                        googleEvents = events;
                    } else {

                        googleEvents = [];
                    }
                } catch (fetchError) {
                    console.error('Error during Google Calendar fetch:', fetchError.message);
                    googleEvents = [];
                }
            }
        } catch (outerError) {
            console.error('Outer Google Calendar error:', outerError.message);
            googleEvents = [];
        }
        
        // Combine all events
        const allEvents = [...weekEvents, ...virtualEvents, ...googleEvents];
        
        res.json(allEvents)
    } catch (error) {
        console.error('\n=== CALENDAR EVENTS REQUEST ERROR ===')
        console.error('Error fetching events:', error)
        console.error('Stack trace:', error.stack)
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
            // Normalize student data to nested structure
            student: {
                id: rb.Subscription.user_id,
                name: rb.Subscription.User.name,
                email: rb.Subscription.User.email
            },
            recurring_booking_id: rb.id
        }));
        
        // Get Google Calendar events with bulletproof error handling
        let googleEvents = [];
        
        try {
            // Try to create service instance - this might fail synchronously
            let googleCalendarService;
            try {
                googleCalendarService = new GoogleCalendarService();

            } catch (serviceError) {

                googleEvents = [];
                // Skip Google Calendar entirely if service creation fails
            }
            
            if (googleCalendarService) {
                try {

                    const isAvailable = await googleCalendarService.isAvailableForInstructor(instructorId);

                    
                    if (isAvailable) {

                        const startDateObj = new Date(date);
                        const endDateObj = new Date(date);
                        endDateObj.setDate(endDateObj.getDate() + 1);
                        
                        const allGoogleEvents = await googleCalendarService.getEvents(instructorId, startDateObj, endDateObj);
                        const filteredEvents = allGoogleEvents.filter(event => event.date === date);
        
                        googleEvents = filteredEvents;
                    } else {

                        googleEvents = [];
                    }
                } catch (fetchError) {
                    console.error('Error during Google Calendar fetch:', fetchError.message);
                    googleEvents = [];
                }
            }
        } catch (outerError) {
            console.error('Outer Google Calendar error:', outerError.message);
            googleEvents = [];
        }
        
        // Combine all events
        const allEvents = [...dayEvents, ...virtualEvents, ...googleEvents];
        
        res.json(allEvents)
    } catch (error) {
        console.error('\n=== DAILY EVENTS REQUEST ERROR ===')
        console.error('Error fetching daily events:', error)
        console.error('Stack trace:', error.stack)
        res.status(500).json({ error: 'Error fetching events' })
    }
});

// Get student bookings
router.get('/student/:studentId', authorizeUserAccess(async (req) => parseInt(req.params.studentId)), async (req, res) => {
    try {
        // Convert studentId to number for comparison
        const studentId = parseInt(req.params.studentId, 10);
        
        // User access already authorized by middleware

        // Check if we should include all bookings (past, cancelled)
        const includeAll = req.query.includeAll === 'true';
        
        const events = includeAll 
            ? await Calendar.getAllStudentEvents(studentId)
            : await Calendar.getStudentEvents(studentId);
            
        res.json(events);
    } catch (error) {
        console.error('Error fetching student bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Update student booking
router.patch('/student/:bookingId', authorizeBooking('update', async (req) => {
    return await Calendar.getEventById(req.params.bookingId);
}), async (req, res) => {
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
        
        // Get the booking to update and preserve original duration
        const booking = await Calendar.findByPk(bookingId);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Always preserve original duration during rescheduling
        const duration = booking.duration;

        // Validate slot duration
        if (duration <= 0) {
            return res.status(400).json({ error: 'Invalid time slot duration' });
        }


        // Booking ownership already verified by authorizeBooking middleware

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

        // Store old booking details for email notification
        const oldBookingDetails = {
            id: booking.id,
            date: booking.date,
            start_slot: booking.start_slot,
            duration: booking.duration
        };

        // Update the booking
        await booking.update({
            date: formattedDate,
            start_slot: startSlot,
            duration: duration
        });

        // Send rescheduling confirmation emails to both student and instructor
        // We do this after the booking is successfully updated
        try {
            // Get the complete booking data with relationships for emails
            const updatedBookingWithDetails = await Calendar.getEventById(booking.id);
            
            if (updatedBookingWithDetails) {
                const emailJobIds = await emailQueueService.queueReschedulingConfirmations(
                    oldBookingDetails,
                    updatedBookingWithDetails
                );
                
            }
        } catch (emailError) {
            // Log email error but don't fail the booking update
            // The rescheduling is already complete and successful
            console.error('Email queue error during rescheduling confirmation:', emailError);
        }

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

// Delete student booking
router.delete('/student/:bookingId', authorizeBooking('cancel', async (req) => {
    return await Calendar.getEventById(req.params.bookingId);
}), async (req, res) => {
    try {
        const bookingId = parseInt(req.params.bookingId, 10);
        const studentId = req.user.id;

        // Get the booking to cancel
        const booking = await Calendar.findByPk(bookingId);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Booking ownership already verified by authorizeBooking middleware

        // Check if booking is in the future (can't cancel past bookings)
        const currentDate = new Date().toISOString().split('T')[0];
        if (booking.date < currentDate) {
            return res.status(400).json({ error: 'Cannot cancel past bookings' });
        }

        // Check for credit usage to refund
        const { CreditUsage } = require('../models/Credits');
        const creditUsage = await CreditUsage.findOne({
            where: { calendar_event_id: bookingId }
        });

        // Use transaction for credit refund and booking cancellation
        const { sequelize } = require('../db/index');
        const transaction = await sequelize.transaction();
        
        try {
            // If there was a credit used, refund it with the correct duration
            if (creditUsage) {
                const { UserCredits } = require('../models/Credits');
                const durationMinutes = creditUsage.duration_minutes || 30; // Default to 30 if not set
                await UserCredits.addCredits(studentId, 1, null, durationMinutes, transaction);
                // Keep the credit usage record for audit purposes, but mark the booking as cancelled
            }

            // Update the booking status to cancelled instead of deleting
            await Calendar.updateEvent(bookingId, { status: 'cancelled' }, transaction);
            
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }

        res.json({
            message: 'Booking cancelled successfully',
            creditRefunded: !!creditUsage
        });

    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ 
            error: 'Failed to cancel booking',
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
                        // Normalize student data to nested structure
                        student: {
                            id: rb.Subscription.user_id,
                            name: rb.Subscription.User.name,
                            email: rb.Subscription.User.email
                        },
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