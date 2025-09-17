const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User } = require('../models/User');
const { Instructor } = require('../models/Instructor');
const { PaymentPlan } = require('../models/PaymentPlan');
const { Subscription } = require('../models/Subscription');
const { authorize, authorizeUserAccess } = require('../middleware/permissions');
const emailQueueService = require('../services/EmailQueueService');
const cronJobService = require('../services/CronJobService');

// Get all users - protected by CASL permissions
router.get('/users', authorize('manage', 'User'), async (req, res) => {
    try {
        const users = await User.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

// Update user
router.put('/users/:id', authorize('manage', 'User'), async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { name, email, role } = req.body;
    
    try {
        await User.updateUser(userId, { name, email, role });
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating user' });
    }
});

// Delete user
router.delete('/users/:id', authorize('manage', 'User'), async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        await User.deleteUser(userId);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Error deleting user' });
    }
});

// Update user role
router.patch('/users/:id', authorize('manage', 'all'), async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const { role } = req.body;

        // Validate role
        const validRoles = ['student', 'instructor', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Update user role
        await User.updateUserRole(userId, role);
        
        res.json({ message: 'User role updated successfully' });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Error updating user role' });
    }
});

// Add this new route for user search
router.get('/users/search', authorize('manage', 'all'), async (req, res) => {
    try {
        const searchQuery = req.query.q.toLowerCase()
        const users = await User.getAllUsers()
        
        const filteredUsers = users.filter(user => 
            user.name.toLowerCase().includes(searchQuery) ||
            user.email.toLowerCase().includes(searchQuery)
        )
        
        res.json(filteredUsers)
    } catch (error) {
        console.error('Error searching users:', error)
        res.status(500).json({ error: 'Error searching users' })
    }
})

// Add new user
router.post('/users', authorize('manage', 'all'), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Hash password before storing
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userId = await User.createUser({
            name,
            email,
            password: hashedPassword,
            role: role || 'student'
        });

        res.status(201).json({ message: 'User created successfully', userId });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
});

// Update instructor
router.patch('/instructors/:id', authorize('manage', 'all'), async (req, res) => {
    try {
        const instructorId = parseInt(req.params.id, 10);
        const { hourly_rate, specialties, bio } = req.body;
        
        await Instructor.updateInstructor(instructorId, { 
            hourly_rate, 
            specialties, 
            bio 
        });
        res.json({ message: 'Instructor updated successfully' });
    } catch (error) {
        console.error('Error updating instructor:', error);
        res.status(500).json({ error: 'Error updating instructor' });
    }
});

// Delete instructor
router.delete('/instructors/:id', authorize('manage', 'all'), async (req, res) => {
    try {
        const instructorId = parseInt(req.params.id, 10);
        await Instructor.deleteInstructor(instructorId);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting instructor:', error);
        res.status(500).json({ error: 'Error deleting instructor' });
    }
});

// Get all payment plans
router.get('/packages', authorize('manage', 'all'), async (req, res) => {
    try {
        const plans = await PaymentPlan.getAll();
        res.json(plans);
    } catch (error) {
        console.error('Error fetching payment plans:', error);
        res.status(500).json({ error: 'Error fetching payment plans' });
    }
});

// Create new payment plan
router.post('/packages', authorize('manage', 'all'), async (req, res) => {
    try {
        const { name, price, credits, type, duration_days } = req.body;
        
        if (!name || !price || !credits || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (type === 'membership' && !duration_days) {
            return res.status(400).json({ error: 'Duration days required for membership plans' });
        }

        const plan = await PaymentPlan.create({
            name,
            price,
            credits,
            type,
            duration_days: type === 'membership' ? duration_days : null
        });

        res.status(201).json(plan);
    } catch (error) {
        console.error('Error creating payment plan:', error);
        res.status(500).json({ error: 'Error creating payment plan' });
    }
});

// Update payment plan
router.put('/packages/:id', authorize('manage', 'all'), async (req, res) => {
    try {
        const planId = parseInt(req.params.id, 10);
        const { name, price, credits, type, duration_days } = req.body;

        if (!name || !price || !credits || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (type === 'membership' && !duration_days) {
            return res.status(400).json({ error: 'Duration days required for membership plans' });
        }

        const plan = await PaymentPlan.findByPk(planId);
        if (!plan) {
            return res.status(404).json({ error: 'Payment plan not found' });
        }

        await plan.update({
            name,
            price,
            credits,
            type,
            duration_days: type === 'membership' ? duration_days : null
        });

        res.json(plan);
    } catch (error) {
        console.error('Error updating payment plan:', error);
        res.status(500).json({ error: 'Error updating payment plan' });
    }
});

// Delete payment plan
router.delete('/packages/:id', authorize('manage', 'all'), async (req, res) => {
    try {
        const planId = parseInt(req.params.id, 10);
        const plan = await PaymentPlan.findByPk(planId);
        
        if (!plan) {
            return res.status(404).json({ error: 'Payment plan not found' });
        }

        await plan.destroy();
        res.json({ message: 'Payment plan deleted successfully' });
    } catch (error) {
        console.error('Error deleting payment plan:', error);
        res.status(500).json({ error: 'Error deleting payment plan' });
    }
});

// Get user's subscription information for admin
router.get('/users/:userId/subscription', authorize('manage', 'all'), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        
        if (!userId) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        
        // First, check if user exists
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get all subscriptions for this user (not just active ones)
        const allSubscriptions = await Subscription.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']]
        });
        
        if (allSubscriptions.length === 0) {
            return res.status(404).json({ error: 'No subscriptions found for this user' });
        }
        
        // Get the most recent subscription
        const subscription = allSubscriptions[0];
        
        // Get the payment plan separately
        const paymentPlan = await PaymentPlan.findByPk(subscription.payment_plan_id);
        if (!paymentPlan) {
            return res.status(404).json({ error: 'Payment plan not found for subscription' });
        }
        
        // Format subscription data for admin interface
        const subscriptionData = {
            id: subscription.id,
            plan_name: paymentPlan.name,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            amount: paymentPlan.price * 100, // Convert to cents for display
            interval: paymentPlan.duration_days > 30 ? 'month' : 'week',
            cancel_at_period_end: subscription.cancel_at_period_end,
            created_at: subscription.created_at,
            updated_at: subscription.updated_at
        };
        
        res.json(subscriptionData);
    } catch (error) {
        console.error('Error fetching user subscription:', error);
        res.status(500).json({ error: 'Error fetching user subscription' });
    }
});

// Admin endpoint to cancel user subscription
router.post('/subscriptions/:subscriptionId/cancel', authorize('manage', 'all'), async (req, res) => {
    try {
        const subscriptionId = parseInt(req.params.subscriptionId, 10);
        const { cancelSubscriptionService } = require('../services/subscriptionCancellation');
        
        const result = await cancelSubscriptionService({
            subscriptionId,
            requestingUser: req.user,
            isAdminAction: true
        });
        
        res.json(result);
    } catch (error) {
        console.error('Error in admin subscription cancellation:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to cancel subscription'
        });
    }
});

// Admin endpoint to reactivate user subscription
router.post('/subscriptions/:subscriptionId/reactivate', authorize('manage', 'all'), async (req, res) => {
    try {
        const subscriptionId = parseInt(req.params.subscriptionId, 10);
        
        if (!subscriptionId) {
            return res.status(400).json({ error: 'Invalid subscription ID' });
        }
        
        // Get subscription from database (admin can reactivate any subscription)
        const subscription = await Subscription.findByPk(subscriptionId, {
            include: [{
                model: User,
                attributes: ['id', 'name', 'email']
            }]
        });
        
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Import required modules
        const { stripe } = require('../config/stripe');
        const { SubscriptionEvent } = require('../models/SubscriptionEvent');
        
        // Get current subscription state from Stripe
        let stripeSubscription;
        try {
            stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        } catch (error) {
            console.error('Error retrieving subscription from Stripe:', error);
            return res.status(500).json({ error: 'Failed to retrieve subscription from Stripe' });
        }
        
        // Case 1: Subscription is active but set to cancel at period end
        if (stripeSubscription.status === 'active' && stripeSubscription.cancel_at_period_end) {
            // Remove the cancellation by updating the subscription in Stripe
            const updatedSubscription = await stripe.subscriptions.update(
                subscription.stripe_subscription_id,
                {
                    cancel_at_period_end: false,
                    proration_behavior: 'none'
                }
            );
            
            // Update local database
            await subscription.update({
                status: 'active',
                cancel_at_period_end: false,
                canceled_at: null
            });
            
            // Record subscription event with admin info
            await SubscriptionEvent.recordEvent(subscription.id, 'admin.subscription.reactivated', {
                ...updatedSubscription,
                admin_user_id: req.user.id,
                admin_user_name: req.user.name,
                reactivation_type: 'removed_cancel_at_period_end'
            });
            
            console.log(`Admin ${req.user.name} (ID: ${req.user.id}) reactivated subscription ${subscriptionId} for user ${subscription.User?.name} (ID: ${subscription.user_id}) - removed cancel at period end`);
            
            return res.json({
                success: true,
                message: 'Subscription reactivated successfully - removed scheduled cancellation',
                reactivation: {
                    subscriptionId: subscription.id,
                    userId: subscription.user_id,
                    userName: subscription.User?.name,
                    reactivatedAt: new Date(),
                    stripeStatus: updatedSubscription.status,
                    reactivationType: 'removed_cancel_at_period_end',
                    reactivatedByAdmin: req.user.name
                }
            });
        }
        
        // Case 2: Subscription is active and not set to cancel
        if (stripeSubscription.status === 'active' && !stripeSubscription.cancel_at_period_end) {
            // Subscription is already active, just sync the database
            await subscription.update({
                status: 'active',
                cancel_at_period_end: false,
                canceled_at: null
            });
            
            return res.json({
                success: true,
                message: 'Subscription is already active',
                reactivation: {
                    subscriptionId: subscription.id,
                    userId: subscription.user_id,
                    userName: subscription.User?.name,
                    stripeStatus: stripeSubscription.status,
                    reactivationType: 'already_active',
                    syncedByAdmin: req.user.name
                }
            });
        }
        
        // Case 3: Subscription is cancelled
        if (stripeSubscription.status === 'canceled') {
            // Cannot reactivate a fully cancelled subscription in Stripe
            // The user would need to create a new subscription
            return res.status(400).json({ 
                error: 'Cannot reactivate a fully cancelled subscription',
                message: 'Once a subscription is cancelled in Stripe, it cannot be reactivated. The user will need to create a new subscription.',
                suggestion: 'Consider directing the user to purchase a new subscription instead.'
            });
        }
        
        // Case 4: Subscription is in incomplete, past_due, or other statuses
        if (stripeSubscription.status === 'incomplete' || stripeSubscription.status === 'past_due') {
            // Update local database to match Stripe status
            await subscription.update({
                status: stripeSubscription.status,
                cancel_at_period_end: stripeSubscription.cancel_at_period_end || false
            });
            
            return res.status(400).json({
                error: `Subscription is in ${stripeSubscription.status} status`,
                message: `The subscription is currently ${stripeSubscription.status} in Stripe. This typically requires payment method updates or manual intervention in Stripe.`,
                suggestion: 'Check the subscription in Stripe dashboard for payment issues or contact the user to update their payment method.'
            });
        }
        
        // Default case: Unknown status
        return res.status(400).json({
            error: 'Unknown subscription status',
            message: `Subscription has status "${stripeSubscription.status}" which is not handled by this endpoint.`,
            stripeStatus: stripeSubscription.status
        });
        
    } catch (error) {
        console.error('Error in admin subscription reactivation:', error);
        res.status(500).json({ 
            error: 'Failed to reactivate subscription',
            details: error.message 
        });
    }
});

// Admin endpoint to create user subscription (comped subscription)
router.post('/users/:userId/subscription', authorize('manage', 'all'), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        const { planId, note } = req.body;
        
        if (!userId || !planId) {
            return res.status(400).json({ error: 'User ID and plan ID are required' });
        }
        
        // Get the user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get the plan
        const plan = await PaymentPlan.findByPk(planId);
        if (!plan) {
            return res.status(404).json({ error: 'Payment plan not found' });
        }
        
        // Only allow membership plans for admin-created subscriptions
        if (plan.type !== 'membership') {
            return res.status(400).json({ error: 'Only membership plans can be created by admin' });
        }
        
        // Check if user already has an active subscription
        const existingSubscription = await Subscription.findOne({
            where: {
                user_id: userId,
                status: ['active', 'trialing']
            }
        });
        
        if (existingSubscription) {
            return res.status(400).json({ 
                error: 'User already has an active subscription',
                suggestion: 'Cancel the existing subscription first, or wait for it to expire'
            });
        }
        
        // Import required modules
        const { stripe } = require('../config/stripe');
        const { SubscriptionEvent } = require('../models/SubscriptionEvent');
        
        // Create or get Stripe customer
        let customer;
        if (user.stripe_customer_id) {
            try {
                customer = await stripe.customers.retrieve(user.stripe_customer_id);
            } catch (error) {
                console.log('Stripe customer not found, creating new one');
                customer = null;
            }
        }
        
        if (!customer) {
            customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: {
                    userId: user.id,
                    createdByAdmin: req.user.id,
                    adminNote: note || 'Admin-created subscription'
                }
            });
            
            // Update user with Stripe customer ID
            await User.update(
                { stripe_customer_id: customer.id },
                { where: { id: user.id } }
            );
        }
        
        // Create or get Stripe price
        let price;
        if (plan.stripe_price_id) {
            try {
                price = await stripe.prices.retrieve(plan.stripe_price_id);
            } catch (error) {
                console.log('Stripe price not found, creating new one');
                price = null;
            }
        }
        
        if (!price) {
            price = await stripe.prices.create({
                unit_amount: Math.round(plan.price * 100),
                currency: 'usd',
                recurring: {
                    interval: 'month'
                },
                product_data: {
                    name: plan.name,
                    metadata: {
                        planId: plan.id
                    }
                }
            });
            
            // Update plan with Stripe price ID
            await PaymentPlan.update(
                { stripe_price_id: price.id },
                { where: { id: plan.id } }
            );
        }
        
        // Create subscription in Stripe with trial (comped subscription)
        const trialEnd = Math.floor((Date.now() + (plan.duration_days * 24 * 60 * 60 * 1000)) / 1000);
        
        const stripeSubscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: price.id }],
            trial_end: trialEnd,
            metadata: {
                createdByAdmin: req.user.id,
                adminNote: note || 'Admin-created subscription',
                planId: plan.id,
                userId: user.id
            }
        });
        
        // Calculate period dates
        const now = new Date();
        const periodStart = now;
        const periodEnd = new Date(now.getTime() + (plan.duration_days * 24 * 60 * 60 * 1000));
        
        // Create subscription record in database
        const dbSubscription = await Subscription.createSubscription(
            user.id,
            plan.id,
            stripeSubscription.id,
            periodStart,
            periodEnd
        );
        
        // Update subscription status to trialing
        await dbSubscription.update({
            status: 'trialing'
        });
        
        // Record subscription event
        await SubscriptionEvent.recordEvent(dbSubscription.id, 'admin.subscription.created', {
            ...stripeSubscription,
            admin_user_id: req.user.id,
            admin_user_name: req.user.name,
            admin_note: note || 'Admin-created subscription',
            subscription_type: 'comped',
            trial_period_days: plan.duration_days
        });
        
        console.log(`Admin ${req.user.name} (ID: ${req.user.id}) created subscription for user ${user.name} (ID: ${user.id}) with plan ${plan.name}`);
        
        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            subscription: {
                id: dbSubscription.id,
                userId: user.id,
                userName: user.name,
                planId: plan.id,
                planName: plan.name,
                status: 'trialing',
                periodStart: periodStart,
                periodEnd: periodEnd,
                createdByAdmin: req.user.name,
                note: note || 'Admin-created subscription'
            }
        });
        
    } catch (error) {
        console.error('Error in admin subscription creation:', error);
        res.status(500).json({ 
            error: 'Failed to create subscription',
            details: error.message 
        });
    }
});

// =============================================================================
// FUTURE FUNCTIONALITY PLACEHOLDERS - Student Booking Management
// =============================================================================
// WARNING: These routes are placeholders for future student booking management
// functionality. Do not remove unless certain they will not be implemented.

/**
 * Get all bookings for a specific user
 * @route GET /api/admin/users/:userId/bookings
 * @param {number} userId - User's database ID
 * @access Admin only
 * @future This will support filtering (upcoming/past/cancelled) and pagination
 */
// router.get('/users/:userId/bookings', authorize('manage', 'all'), async (req, res) => {
//     // Future implementation for admin to view user's bookings with filters
// });

/**
 * Update/reschedule a specific booking for a user
 * @route PATCH /api/admin/users/:userId/bookings/:bookingId
 * @param {number} userId - User's database ID
 * @param {number} bookingId - Booking's database ID
 * @access Admin only
 * @future This will handle booking rescheduling and status updates
 */
// router.patch('/users/:userId/bookings/:bookingId', authorize('manage', 'all'), async (req, res) => {
//     // Future implementation for admin to reschedule/update user bookings
// });

/**
 * Cancel a specific booking for a user
 * @route DELETE /api/admin/users/:userId/bookings/:bookingId
 * @param {number} userId - User's database ID
 * @param {number} bookingId - Booking's database ID
 * @access Admin only
 * @future This will handle booking cancellation with proper refund logic
 */
// router.delete('/users/:userId/bookings/:bookingId', authorize('manage', 'all'), async (req, res) => {
//     // Future implementation for admin to cancel user bookings
// });

// Email system monitoring endpoints
// Get email queue status
router.get('/email/status', authorize('manage', 'all'), async (req, res) => {
    try {
        const queueStatus = emailQueueService.getStatus();
        const cronStatus = cronJobService.getStatus();
        
        res.json({
            email_queue: queueStatus,
            cron_jobs: cronStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching email status:', error);
        res.status(500).json({ error: 'Error fetching email status' });
    }
});

// Clear email queue (emergency use)
router.post('/email/clear-queue', authorize('manage', 'all'), async (req, res) => {
    try {
        const clearedCount = emailQueueService.clearQueue();
        res.json({ 
            message: `Cleared ${clearedCount} emails from queue`,
            clearedCount 
        });
    } catch (error) {
        console.error('Error clearing email queue:', error);
        res.status(500).json({ error: 'Error clearing email queue' });
    }
});

// Manually trigger low balance check (for testing)
router.post('/email/test-low-balance', authorize('manage', 'all'), async (req, res) => {
    try {
        await cronJobService.runLowBalanceCheck();
        res.json({ message: 'Low balance check triggered successfully' });
    } catch (error) {
        console.error('Error triggering low balance check:', error);
        res.status(500).json({ error: 'Error triggering low balance check' });
    }
});

module.exports = router; 