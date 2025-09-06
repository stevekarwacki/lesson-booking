const express = require('express');
const router = express.Router();
const { RecurringBooking } = require('../models/RecurringBooking');
const { Subscription } = require('../models/Subscription');
const { authMiddleware } = require('../middleware/auth');
const { authorize, authorizeUserAccess, authorizeResource } = require('../middleware/permissions');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create a new recurring booking
router.post('/', authorize('create', 'RecurringBooking'), async (req, res) => {
    try {
        const { subscriptionId, instructorId, dayOfWeek, startSlot, duration } = req.body;
        
        // Validate required fields
        if (!subscriptionId || !instructorId || dayOfWeek === undefined || !startSlot || !duration) {
            return res.status(400).json({ 
                error: 'Missing required fields: subscriptionId, instructorId, dayOfWeek, startSlot, duration' 
            });
        }
        
        // Validate that the subscription belongs to the authenticated user
        const subscription = await Subscription.findByPk(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Check if user can access this subscription using CASL
        const { can } = require('../utils/abilities');
        const { subject } = require('@casl/ability');
        if (!can(req.user, 'read', 'Subscription', subscription)) {
            return res.status(403).json({ error: 'Access denied - not your subscription' });
        }
        
        // Create the recurring booking
        const recurringBooking = await RecurringBooking.createForSubscription(subscriptionId, {
            instructor_id: instructorId,
            day_of_week: dayOfWeek,
            start_slot: startSlot,
            duration: duration
        });
        
        // Return the created booking with related data
        const createdBooking = await RecurringBooking.findByPk(recurringBooking.id, {
            include: [
                {
                    model: Subscription,
                    include: [{ model: require('../models/User').User }]
                },
                {
                    model: require('../models/Instructor').Instructor,
                    include: [{ model: require('../models/User').User }]
                }
            ]
        });
        
        res.status(201).json({
            message: 'Recurring booking created successfully',
            recurringBooking: createdBooking
        });
        
    } catch (error) {
        console.error('Error creating recurring booking:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get recurring bookings for a specific user
router.get('/user/:userId', authorizeUserAccess(async (req) => parseInt(req.params.userId)), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        
        // User access already authorized by middleware
        
        // Find all recurring bookings for the user's active subscriptions
        const subscriptions = await Subscription.findAll({
            where: { user_id: userId, status: 'active' }
        });
        
        const subscriptionIds = subscriptions.map(sub => sub.id);
        
        const recurringBookings = await RecurringBooking.findAll({
            where: { subscription_id: subscriptionIds },
            include: [
                {
                    model: Subscription,
                    include: [{ model: require('../models/User').User }]
                },
                {
                    model: require('../models/Instructor').Instructor,
                    include: [{ model: require('../models/User').User }]
                }
            ]
        });
        
        res.json(recurringBookings);
        
    } catch (error) {
        console.error('Error fetching user recurring bookings:', error);
        res.status(500).json({ error: 'Failed to fetch recurring bookings' });
    }
});

// Get recurring booking by subscription ID
router.get('/subscription/:subscriptionId', authorizeResource('read', 'Subscription', async (req) => {
    const subscription = await Subscription.findByPk(req.params.subscriptionId);
    return subscription;
}), async (req, res) => {
    try {
        const subscriptionId = parseInt(req.params.subscriptionId, 10);
        
        // Subscription access already authorized by middleware
        const subscription = req.resource; // Set by authorizeResource middleware
        
        const recurringBooking = await RecurringBooking.findBySubscriptionId(subscriptionId);
        
        if (!recurringBooking) {
            return res.status(404).json({ error: 'No recurring booking found for this subscription' });
        }
        
        res.json(recurringBooking);
        
    } catch (error) {
        console.error('Error fetching recurring booking by subscription:', error);
        res.status(500).json({ error: 'Failed to fetch recurring booking' });
    }
});

// Get recurring bookings for an instructor on a specific day
router.get('/instructor/:instructorId/day/:dayOfWeek', authorize('read', 'RecurringBooking'), async (req, res) => {
    try {
        const instructorId = parseInt(req.params.instructorId, 10);
        const dayOfWeek = parseInt(req.params.dayOfWeek, 10);
        
        // Validate day of week
        if (dayOfWeek < 0 || dayOfWeek > 6) {
            return res.status(400).json({ error: 'Invalid day of week (must be 0-6)' });
        }
        
        const recurringBookings = await RecurringBooking.findByInstructorAndDay(instructorId, dayOfWeek);
        
        res.json(recurringBookings);
        
    } catch (error) {
        console.error('Error fetching instructor recurring bookings:', error);
        res.status(500).json({ error: 'Failed to fetch recurring bookings' });
    }
});

// Update a recurring booking
router.put('/:id', authorizeResource('update', 'RecurringBooking', async (req) => {
    const booking = await RecurringBooking.findByPk(req.params.id, {
        include: [{ model: Subscription }]
    });
    // Transform to match our permissions model (check subscription ownership)
    if (booking && booking.Subscription) {
        return { user_id: booking.Subscription.user_id, instructor_id: booking.instructor_id };
    }
    return booking;
}), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { instructorId, dayOfWeek, startSlot, duration } = req.body;
        
        // Find the existing booking
        const existingBooking = await RecurringBooking.findByPk(id, {
            include: [{ model: Subscription }]
        });
        
        if (!existingBooking) {
            return res.status(404).json({ error: 'Recurring booking not found' });
        }
        
        // Recurring booking ownership already verified by authorizeResource middleware
        
        // Prepare updates object
        const updates = {};
        if (instructorId !== undefined) updates.instructor_id = instructorId;
        if (dayOfWeek !== undefined) updates.day_of_week = dayOfWeek;
        if (startSlot !== undefined) updates.start_slot = startSlot;
        if (duration !== undefined) updates.duration = duration;
        
        // Update the booking
        const updatedBooking = await RecurringBooking.updateRecurringBooking(id, updates);
        
        // Return the updated booking with related data
        const result = await RecurringBooking.findByPk(id, {
            include: [
                {
                    model: Subscription,
                    include: [{ model: require('../models/User').User }]
                },
                {
                    model: require('../models/Instructor').Instructor,
                    include: [{ model: require('../models/User').User }]
                }
            ]
        });
        
        res.json({
            message: 'Recurring booking updated successfully',
            recurringBooking: result
        });
        
    } catch (error) {
        console.error('Error updating recurring booking:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete a recurring booking
router.delete('/:id', authorizeResource('delete', 'RecurringBooking', async (req) => {
    const booking = await RecurringBooking.findByPk(req.params.id, {
        include: [{ model: Subscription }]
    });
    // Transform to match our permissions model (check subscription ownership)
    if (booking && booking.Subscription) {
        return { user_id: booking.Subscription.user_id, instructor_id: booking.instructor_id };
    }
    return booking;
}), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        
        // Find the existing booking
        const existingBooking = await RecurringBooking.findByPk(id, {
            include: [{ model: Subscription }]
        });
        
        if (!existingBooking) {
            return res.status(404).json({ error: 'Recurring booking not found' });
        }
        
        // Recurring booking ownership already verified by authorizeResource middleware
        
        // Delete the booking
        await existingBooking.destroy();
        
        res.json({ message: 'Recurring booking deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting recurring booking:', error);
        res.status(500).json({ error: 'Failed to delete recurring booking' });
    }
});

module.exports = router; 