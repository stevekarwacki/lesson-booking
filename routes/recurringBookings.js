const express = require('express');
const router = express.Router();
const { RecurringBooking } = require('../models/RecurringBooking');
const { Subscription } = require('../models/Subscription');
const { authMiddleware } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create a new recurring booking
router.post('/', async (req, res) => {
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
        
        if (subscription.user_id !== req.user.id) {
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
router.get('/user/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        
        // Ensure user can only access their own bookings or user is admin
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
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
router.get('/subscription/:subscriptionId', async (req, res) => {
    try {
        const subscriptionId = parseInt(req.params.subscriptionId, 10);
        
        // Validate that the subscription belongs to the authenticated user
        const subscription = await Subscription.findByPk(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Debug logging
        console.log('Debug - Subscription user_id:', subscription.user_id);
        console.log('Debug - Authenticated user id:', req.user.id);
        console.log('Debug - User role:', req.user.role);
        
        if (subscription.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ 
                error: 'Access denied',
                debug: {
                    subscriptionUserId: subscription.user_id,
                    authenticatedUserId: req.user.id,
                    userRole: req.user.role
                }
            });
        }
        
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
router.get('/instructor/:instructorId/day/:dayOfWeek', async (req, res) => {
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
router.put('/:id', async (req, res) => {
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
        
        // Validate that the user owns this booking
        if (existingBooking.Subscription.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
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
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        
        // Find the existing booking
        const existingBooking = await RecurringBooking.findByPk(id, {
            include: [{ model: Subscription }]
        });
        
        if (!existingBooking) {
            return res.status(404).json({ error: 'Recurring booking not found' });
        }
        
        // Validate that the user owns this booking
        if (existingBooking.Subscription.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Delete the booking
        await existingBooking.destroy();
        
        res.json({ message: 'Recurring booking deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting recurring booking:', error);
        res.status(500).json({ error: 'Failed to delete recurring booking' });
    }
});

module.exports = router; 