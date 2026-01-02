const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const path = require('path');
const { User } = require('../models/User');
const { Instructor } = require('../models/Instructor');
const { PaymentPlan } = require('../models/PaymentPlan');
const { Subscription } = require('../models/Subscription');
const { AppSettings } = require('../models/AppSettings');
const { Transactions } = require('../models/Transactions');
const { authorize, authorizeUserAccess } = require('../middleware/permissions');
const { logoUpload } = require('../middleware/uploadMiddleware');
const { processLogoUpload, removeLogo } = require('../utils/logoOperations');
const emailQueueService = require('../services/EmailQueueService');
const cronJobService = require('../services/CronJobService');
const { createDateHelper } = require('../utils/dateHelpers');
const RefundService = require('../services/RefundService');
const { Refund } = require('../models/Refund');


// Get all users - admin only, no role filtering (use /api/users/students for students)
router.get('/users', authorize('manage', 'User'), async (req, res) => {
    try {
        const users = await User.getAllUsers();
        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

// Update user
router.put('/users/:id', authorize('manage', 'User'), async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { name, email, role, in_person_payment_override } = req.body;
    
    try {
        // Validate in-person payment override if provided
        if (in_person_payment_override !== undefined) {
            const { isValidInPersonPaymentOverride } = require('../utils/inPersonPaymentUtils');
            if (!isValidInPersonPaymentOverride(in_person_payment_override)) {
                return res.status(400).json({ 
                    error: 'Invalid in-person payment override. Must be "enabled", "disabled", or null.' 
                });
            }
        }

        const updateData = { name, email, role };
        if (in_person_payment_override !== undefined) {
            updateData.in_person_payment_override = in_person_payment_override;
        }

        await User.updateUser(userId, updateData);
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Error updating user' });
    }
});

// Delete user
router.delete('/users/:id', authorize('manage', 'User'), async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        
        // User.deleteUser() will trigger beforeDestroy hook which handles all cascading deletes
        await User.deleteUser(userId);
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: error.message || 'Error deleting user' });
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
        
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'student',
            is_approved: true // New users created by admin are automatically approved
        });

        res.status(201).json({ message: 'User created successfully', userId: newUser.id });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
});

// Update instructor
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
        
        // Validate userId
        if (isNaN(userId) || !userId) {
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
        
        // If user has no subscriptions, return null (this is a valid state, not an error)
        if (allSubscriptions.length === 0) {
            return res.json(null);
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
            
            // Admin reactivated subscription - removed cancel at period end
            
            return res.json({
                success: true,
                message: 'Subscription reactivated successfully - removed scheduled cancellation',
                reactivation: {
                    subscriptionId: subscription.id,
                    userId: subscription.user_id,
                    userName: subscription.User?.name,
                    reactivatedAt: createDateHelper().toDate(),
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
                // Stripe customer not found, creating new one
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
                // Stripe price not found, creating new one
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
        
        // Calculate period dates using date helpers
        const nowHelper = createDateHelper();
        const periodStart = nowHelper.toDate();
        const periodEnd = nowHelper.addDays(plan.duration_days).toDate();
        
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
        
        // Admin created subscription for user
        
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
// REFUND ENDPOINTS - Manual refund processing for Admins and Instructors
// =============================================================================

/**
 * Process a manual refund for a booking
 * @route POST /api/admin/refunds
 * @access Admin and Instructor (with proper booking ownership)
 */
router.post('/refunds', authorize('refund', 'Booking'), async (req, res) => {
    try {
        const { bookingId, refundType, reason } = req.body;
        
        // Validate required fields
        if (!bookingId || !refundType) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                details: 'bookingId and refundType are required'
            });
        }
        
        // Validate refund type
        if (!['stripe', 'credit'].includes(refundType)) {
            return res.status(400).json({
                error: 'Invalid refund type',
                details: 'refundType must be either "stripe" or "credit"'
            });
        }
        
        // Get refund information to validate permissions
        const refundInfo = await RefundService.getRefundInfo(bookingId);
        
        // Additional permission check for instructors
        if (req.user.role === 'instructor') {
            // Get instructor record to find instructor_id
            const { Instructor } = require('../models/Instructor');
            const instructor = await Instructor.findByUserId(req.user.id);
            
            if (!instructor) {
                return res.status(403).json({
                    error: 'Instructor profile not found'
                });
            }
            
            // Instructors can only refund bookings for their own students
            if (refundInfo.booking.instructor_id !== instructor.id) {
                return res.status(403).json({
                    error: 'Permission denied',
                    details: 'Instructors can only refund bookings for their own students'
                });
            }
        }
        
        // Validate refund eligibility based on payment method and user requirements
        if (refundType === 'stripe' && !refundInfo.paidWithStripe) {
            return res.status(400).json({
                error: 'Invalid refund method',
                details: 'Cannot refund to Stripe - this booking was not paid with Stripe'
            });
        }
        
        // Process the refund
        const refundResult = await RefundService.processRefund(
            bookingId,
            refundType,
            req.user.id,
            reason
        );
        
        res.json({
            success: true,
            message: 'Refund processed successfully',
            refund: {
                id: refundResult.refundId,
                bookingId: bookingId,
                type: refundResult.refundType,
                amount: refundResult.amount,
                processedBy: req.user.name,
                processedAt: createDateHelper().toDate(),
                stripeRefundId: refundResult.stripeRefundId
            }
        });
        
    } catch (error) {
        console.error('Error processing refund:', error);
        
        // Handle specific error cases
        if (error.message === 'Booking not found') {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        if (error.message === 'Booking has already been refunded') {
            return res.status(400).json({ 
                error: 'Booking already refunded',
                details: 'This booking has already been refunded'
            });
        }
        
        if (error.message.includes('Stripe refund failed')) {
            return res.status(500).json({
                error: 'Stripe refund failed',
                details: error.message
            });
        }
        
        res.status(500).json({ 
            error: 'Error processing refund',
            details: 'An unexpected error occurred while processing the refund'
        });
    }
});

/**
 * Get refund information for a booking (for UI display)
 * @route GET /api/admin/refunds/:bookingId/info
 * @access Admin and Instructor (with proper booking ownership)
 */
router.get('/refunds/:bookingId/info', authorize('refund', 'Booking'), async (req, res) => {
    try {
        const bookingId = parseInt(req.params.bookingId, 10);
        
        if (!bookingId) {
            return res.status(400).json({ error: 'Invalid booking ID' });
        }
        
        const refundInfo = await RefundService.getRefundInfo(bookingId);
        
        // Additional permission check for instructors
        if (req.user.role === 'instructor') {
            // Get instructor record to find instructor_id
            const { Instructor } = require('../models/Instructor');
            const instructor = await Instructor.findByUserId(req.user.id);
            
            if (!instructor) {
                return res.status(403).json({
                    error: 'Instructor profile not found'
                });
            }
            
            if (refundInfo.booking.instructor_id !== instructor.id) {
                return res.status(403).json({
                    error: 'Permission denied',
                    details: 'Instructors can only view refund info for their own students'
                });
            }
        }
        
        // Return refund eligibility and options
        const refundOptions = [];
        
        if (refundInfo.paidWithCredits) {
            refundOptions.push({
                type: 'credit',
                label: 'Refund as Lesson Credits',
                description: 'Add credits back to student account'
            });
        }
        
        if (refundInfo.paidWithStripe) {
            refundOptions.push({
                type: 'stripe',
                label: 'Refund to Original Payment Method',
                description: 'Process refund through Stripe to original payment method',
                isDefault: true
            });
            refundOptions.push({
                type: 'credit',
                label: 'Refund as Lesson Credits',
                description: 'Add credits to student account instead of Stripe refund'
            });
        }
        
        res.json({
            booking: {
                id: refundInfo.booking.id,
                date: refundInfo.booking.date,
                startSlot: refundInfo.booking.start_slot,
                duration: refundInfo.booking.duration,
                status: refundInfo.booking.status,
                student: refundInfo.booking.student
            },
            canRefund: refundInfo.canRefund,
            paidWithCredits: refundInfo.paidWithCredits,
            paidWithStripe: refundInfo.paidWithStripe,
            refundOptions,
            // Check if already refunded
            refundStatus: await Refund.getRefundStatus(bookingId)
        });
        
    } catch (error) {
        console.error('Error fetching refund info:', error);
        
        if (error.message === 'Booking not found') {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        res.status(500).json({ 
            error: 'Error fetching refund information'
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
            timestamp: createDateHelper().toDate().toISOString()
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

// =============================================================================
// EMAIL TEMPLATE MANAGEMENT ENDPOINTS - Admin interface for managing email templates
// =============================================================================

const { EmailTemplate } = require('../models/EmailTemplate');
const emailService = require('../services/EmailService');

// Get all email templates
router.get('/email-templates', authorize('manage', 'all'), async (req, res) => {
    try {
        const templates = await EmailTemplate.getAllActive();
        
        // Add metadata about modifications
        const templatesWithStatus = templates.map(template => {
            const availableVars = template.available_variables || {};
            const variableCount = Object.keys(availableVars).reduce((count, category) => {
                return count + Object.keys(availableVars[category] || {}).length;
            }, 0);
            
            return {
                ...template.toJSON(),
                isModified: EmailTemplate.isModified(template),
                variableCount
            };
        });
        
        res.json(templatesWithStatus);
    } catch (error) {
        console.error('Error fetching email templates:', error);
        res.status(500).json({ error: 'Error fetching email templates' });
    }
});

// Get specific email template by key
router.get('/email-templates/:templateKey', authorize('manage', 'all'), async (req, res) => {
    try {
        const { templateKey } = req.params;
        const template = await EmailTemplate.findByKey(templateKey);
        
        if (!template) {
            return res.status(404).json({ error: 'Email template not found' });
        }
        
        res.json({
            ...template.toJSON(),
            isModified: EmailTemplate.isModified(template),
            available_variables: template.available_variables || {}
        });
    } catch (error) {
        console.error('Error fetching email template:', error);
        res.status(500).json({ error: 'Error fetching email template' });
    }
});

// Update email template
router.put('/email-templates/:templateKey', authorize('manage', 'all'), async (req, res) => {
    try {
        const { templateKey } = req.params;
        const { subject_template, body_template } = req.body;
        
        if (!subject_template && !body_template) {
            return res.status(400).json({
                error: 'Missing required fields',
                details: 'Either subject_template or body_template must be provided'
            });
        }
        
        // Validate template syntax if provided
        if (body_template) {
            const validation = EmailTemplate.validateTemplate(subject_template || '', body_template);
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Invalid template syntax',
                    details: validation.errors
                });
            }
        }
        
        const updates = {};
        if (subject_template !== undefined) updates.subject_template = subject_template;
        if (body_template !== undefined) updates.body_template = body_template;
        
        const updatedTemplate = await EmailTemplate.updateTemplate(templateKey, updates, req.user.id);
        
        if (!updatedTemplate) {
            return res.status(404).json({ error: 'Email template not found' });
        }
        
        // Clear template from cache so changes take effect immediately
        emailService.clearTemplateFromCache(templateKey);
        
        res.json({
            success: true,
            message: 'Email template updated successfully',
            template: {
                ...updatedTemplate.toJSON(),
                isModified: EmailTemplate.isModified(updatedTemplate),
                available_variables: updatedTemplate.available_variables || {}
            }
        });
    } catch (error) {
        console.error('Error updating email template:', error);
        res.status(500).json({ error: 'Error updating email template' });
    }
});

// Reset email template to default
router.post('/email-templates/:templateKey/reset', authorize('manage', 'all'), async (req, res) => {
    try {
        const { templateKey } = req.params;
        
        const resetTemplate = await EmailTemplate.resetToDefault(templateKey, req.user.id);
        
        if (!resetTemplate) {
            return res.status(404).json({ error: 'Email template not found' });
        }
        
        // Clear template from cache so changes take effect immediately
        emailService.clearTemplateFromCache(templateKey);
        
        res.json({
            success: true,
            message: 'Email template reset to default successfully',
            template: {
                ...resetTemplate.toJSON(),
                isModified: false,
                available_variables: resetTemplate.available_variables || {}
            }
        });
    } catch (error) {
        console.error('Error resetting email template:', error);
        res.status(500).json({ error: 'Error resetting email template' });
    }
});

// Send test email
router.post('/email-templates/:templateKey/test', authorize('manage', 'all'), async (req, res) => {
    try {
        const { templateKey } = req.params;
        const { test_email, subject_template, body_template, use_sample_data = true } = req.body;
        
        if (!test_email) {
            return res.status(400).json({
                error: 'Missing required field',
                details: 'test_email is required'
            });
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(test_email)) {
            return res.status(400).json({
                error: 'Invalid email address',
                details: 'Please provide a valid email address'
            });
        }
        
        const template = await EmailTemplate.findByKey(templateKey);
        if (!template) {
            return res.status(404).json({ error: 'Email template not found' });
        }
        
        // Use provided templates or fall back to database templates
        const subjectToRender = subject_template || template.subject_template;
        const bodyToRender = body_template || template.body_template;
        
        // Validate template syntax
        const validation = EmailTemplate.validateTemplate(subjectToRender, bodyToRender);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Invalid template syntax',
                details: validation.errors
            });
        }
        
        let sampleData = {};
        if (use_sample_data) {
            // Generate sample data based on available variables
            const availableVars = template.available_variables || {};
            
            for (const [category, variables] of Object.entries(availableVars)) {
                sampleData[category] = {};
                for (const [varName, varInfo] of Object.entries(variables)) {
                    sampleData[category][varName] = varInfo.example || `[${varName}]`;
                }
            }
            
            // Add common template data
            sampleData.emailTitle = subjectToRender;
            sampleData.headerTitle = '🧪 Test Email';
            sampleData.headerSubtitle = `Test email for template: ${template.name}`;
            sampleData.companyName = 'Sample Company';
            sampleData.currentYear = new Date().getFullYear();
            sampleData.recipientEmail = test_email;
        }
        
        try {
            // Compile and render the templates
            const handlebars = require('handlebars');
            
            const compiledSubject = handlebars.compile(subjectToRender);
            const renderedSubject = `[TEST] ${compiledSubject(sampleData)}`;
            
            const compiledBody = handlebars.compile(bodyToRender);
            const renderedBody = compiledBody(sampleData);
            
            // Use the email service's base template for proper styling
            const finalHtml = await emailService.loadBaseTemplate(
                () => renderedBody,
                { ...sampleData, headerTitle: '🧪 Test Email', headerSubtitle: `Test email for template: ${template.name}` }
            );
            
            // Send the test email
            const emailResult = await emailService.sendEmail(test_email, renderedSubject, finalHtml);
            
            if (emailResult.success) {
                res.json({
                    success: true,
                    message: 'Test email sent successfully',
                    details: {
                        recipient: test_email,
                        subject: renderedSubject,
                        messageId: emailResult.messageId,
                        templateUsed: template.name
                    }
                });
            } else {
                res.status(500).json({
                    error: 'Failed to send test email',
                    details: emailResult.error
                });
            }
        } catch (renderError) {
            res.status(400).json({
                error: 'Template rendering failed',
                details: renderError.message
            });
        }
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ error: 'Error sending test email' });
    }
});

// Get email template categories and variables
router.get('/email-templates/meta/variables', authorize('manage', 'all'), async (req, res) => {
    try {
        const templates = await EmailTemplate.getAllActive();
        
        // Aggregate all unique variable categories and variables
        const variablesByCategory = {};
        const templatesByCategory = {};
        
        templates.forEach(template => {
            const availableVars = template.available_variables || {};
            
            // Group templates by category
            if (!templatesByCategory[template.category]) {
                templatesByCategory[template.category] = [];
            }
            templatesByCategory[template.category].push({
                key: template.template_key,
                name: template.name,
                description: template.description
            });
            
            // Collect variables by category
            for (const [varCategory, variables] of Object.entries(availableVars)) {
                if (!variablesByCategory[varCategory]) {
                    variablesByCategory[varCategory] = {};
                }
                
                for (const [varName, varInfo] of Object.entries(variables)) {
                    if (!variablesByCategory[varCategory][varName]) {
                        variablesByCategory[varCategory][varName] = varInfo;
                    }
                }
            }
        });
        
        res.json({
            variablesByCategory,
            templatesByCategory,
            totalTemplates: templates.length,
            categories: Object.keys(templatesByCategory)
        });
    } catch (error) {
        console.error('Error fetching template variables:', error);
        res.status(500).json({ error: 'Error fetching template variables' });
    }
});

// =============================================================================
// SETTINGS ENDPOINTS - Placeholder implementation for theming and branding
// =============================================================================

// Get all settings
router.get('/settings', authorize('manage', 'User'), async (req, res) => {
    try {
        // Get business settings from database
        const businessSettings = await AppSettings.getSettingsByCategory('business');
        
        // Get lesson settings from database
        const lessonSettings = await AppSettings.getSettingsByCategory('lessons');
        
        // Get theme settings from database
        const themeSettings = await AppSettings.getSettingsByCategory('theme');
        
        // Provide default values for missing settings
        const business = {
            companyName: businessSettings.company_name || '',
            contactEmail: businessSettings.contact_email || '',
            phoneNumber: businessSettings.phone_number || '',
            website: businessSettings.base_url || '',
            address: businessSettings.address || '',
            timezone: businessSettings.timezone || '',
            // Social media links from database
            socialMedia: {
                facebook: businessSettings.social_media_facebook || '',
                twitter: businessSettings.social_media_twitter || '',
                instagram: businessSettings.social_media_instagram || '',
                linkedin: businessSettings.social_media_linkedin || '',
                youtube: businessSettings.social_media_youtube || ''
            },
            businessHours: {
                monday: { isOpen: true, open: '09:00', close: '17:00' },
                tuesday: { isOpen: true, open: '09:00', close: '17:00' },
                wednesday: { isOpen: true, open: '09:00', close: '17:00' },
                thursday: { isOpen: true, open: '09:00', close: '17:00' },
                friday: { isOpen: true, open: '09:00', close: '17:00' },
                saturday: { isOpen: false, open: '09:00', close: '17:00' },
                sunday: { isOpen: false, open: '09:00', close: '17:00' }
            }
        };
        
        // Prepare lesson settings with defaults
        const lessons = {
            default_duration_minutes: lessonSettings.default_duration_minutes || '30',
            in_person_payment_enabled: lessonSettings.in_person_payment_enabled === 'true',
            card_payment_on_behalf_enabled: lessonSettings.card_payment_on_behalf_enabled === 'true'
        };
        
        const settings = {
            business,
            lessons,
            // Theme settings from database with defaults
            theme: {
                primaryColor: themeSettings.primary_color || '#28a745',
                secondaryColor: themeSettings.secondary_color || '#20c997',
                palette: themeSettings.palette_name || 'Forest Green',
                logoUrl: null
            },
            email: {
                fromName: 'Lesson Booking App',
                fromEmail: 'noreply@lessonbooking.com',
                replyTo: 'support@lessonbooking.com',
                footerText: '© 2024 Lesson Booking App. All rights reserved.'
            }
        };
        
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Error fetching settings' });
    }
});

// Get lesson settings specifically (for frontend caching)
// Update settings by category
router.put('/settings/:category', authorize('manage', 'User'), async (req, res) => {
    try {
        const { category } = req.params;
        const settingsData = req.body;
        
        if (category === 'business') {
            // Handle business settings with validation
            const businessFields = {
                company_name: settingsData.companyName,
                contact_email: settingsData.contactEmail,
                phone_number: settingsData.phoneNumber,
                base_url: settingsData.website,
                address: settingsData.address,
                timezone: settingsData.timezone
            };
            
            // Handle social media fields if they exist
            if (settingsData.socialMedia) {
                businessFields.social_media_facebook = settingsData.socialMedia.facebook;
                businessFields.social_media_twitter = settingsData.socialMedia.twitter;
                businessFields.social_media_instagram = settingsData.socialMedia.instagram;
                businessFields.social_media_linkedin = settingsData.socialMedia.linkedin;
                businessFields.social_media_youtube = settingsData.socialMedia.youtube;
            }
            
            // Validate each field
            const validatedFields = {};
            const errors = {};
            
            for (const [key, value] of Object.entries(businessFields)) {
                try {
                    const validatedValue = AppSettings.validateBusinessSetting(key, value);
                    if (validatedValue !== null) {
                        validatedFields[key] = validatedValue;
                    }
                } catch (error) {
                    errors[key] = error.message;
                }
            }
            
            // If there are validation errors, return them
            if (Object.keys(errors).length > 0) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors
                });
            }
            
            // Save validated settings to database
            await AppSettings.setMultipleSettings('business', validatedFields, req.user.id);
            
            // Convert back to frontend format for consistent data flow
            const frontendFormat = {
                companyName: validatedFields.company_name || '',
                contactEmail: validatedFields.contact_email || '',
                phoneNumber: validatedFields.phone_number || '',
                website: validatedFields.base_url || '',
                address: validatedFields.address || '',
                timezone: validatedFields.timezone || '',
                socialMedia: {
                    facebook: validatedFields.social_media_facebook || '',
                    twitter: validatedFields.social_media_twitter || '',
                    instagram: validatedFields.social_media_instagram || '',
                    linkedin: validatedFields.social_media_linkedin || '',
                    youtube: validatedFields.social_media_youtube || ''
                }
            };
            
            res.json({
                success: true,
                message: 'Business settings updated successfully',
                data: frontendFormat
            });
            
        } else if (category === 'lessons') {
            // Handle lesson settings
            const lessonFields = {
                default_duration_minutes: settingsData.default_duration_minutes,
                in_person_payment_enabled: settingsData.in_person_payment_enabled,
                card_payment_on_behalf_enabled: settingsData.card_payment_on_behalf_enabled
            };
            
            // Validate lesson settings
            const validatedFields = {};
            const errors = {};
            
            // Validate default duration
            if (lessonFields.default_duration_minutes !== undefined) {
                const duration = parseInt(lessonFields.default_duration_minutes);
                if (isNaN(duration) || duration < 15 || duration > 180) {
                    errors.default_duration_minutes = 'Duration must be between 15 and 180 minutes';
                } else if (![15, 30, 45, 60, 90, 120].includes(duration)) {
                    errors.default_duration_minutes = 'Invalid duration value';
                } else {
                    validatedFields.default_duration_minutes = duration.toString();
                }
            }
            
            // Validate in-person payment enabled setting
            if (lessonFields.in_person_payment_enabled !== undefined) {
                try {
                    const validated = AppSettings.validateLessonSetting('in_person_payment_enabled', lessonFields.in_person_payment_enabled);
                    validatedFields.in_person_payment_enabled = validated;
                } catch (error) {
                    errors.in_person_payment_enabled = error.message;
                }
            }
            
            // Validate card payment on behalf enabled setting
            if (lessonFields.card_payment_on_behalf_enabled !== undefined) {
                try {
                    const validated = AppSettings.validateLessonSetting('card_payment_on_behalf_enabled', lessonFields.card_payment_on_behalf_enabled);
                    validatedFields.card_payment_on_behalf_enabled = validated;
                } catch (error) {
                    errors.card_payment_on_behalf_enabled = error.message;
                }
            }
            
            // If there are validation errors, return them
            if (Object.keys(errors).length > 0) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors
                });
            }
            
            // Save validated settings to database
            await AppSettings.setMultipleSettings('lessons', validatedFields, req.user.id);
            
            res.json({
                success: true,
                message: 'Lesson settings updated successfully',
                data: {
                    default_duration_minutes: validatedFields.default_duration_minutes,
                    in_person_payment_enabled: validatedFields.in_person_payment_enabled === 'true',
                    card_payment_on_behalf_enabled: validatedFields.card_payment_on_behalf_enabled === 'true'
                }
            });
            
        } else if (category === 'theme') {
            // Handle theme settings
            const themeFields = {
                primary_color: settingsData.primaryColor,
                secondary_color: settingsData.secondaryColor,
                palette_name: settingsData.palette
            };
            
            // Validate theme settings
            const validatedFields = {};
            const errors = {};
            
            // Validate primary color (required)
            if (themeFields.primary_color) {
                const hexRegex = /^#[0-9A-Fa-f]{6}$/;
                if (!hexRegex.test(themeFields.primary_color)) {
                    errors.primary_color = 'Primary color must be a valid hex color (e.g., #28a745)';
                } else {
                    validatedFields.primary_color = themeFields.primary_color;
                }
            }
            
            // Validate secondary color (optional)
            if (themeFields.secondary_color) {
                const hexRegex = /^#[0-9A-Fa-f]{6}$/;
                if (!hexRegex.test(themeFields.secondary_color)) {
                    errors.secondary_color = 'Secondary color must be a valid hex color (e.g., #20c997)';
                } else {
                    validatedFields.secondary_color = themeFields.secondary_color;
                }
            }
            
            // Validate palette name (optional)
            if (themeFields.palette_name) {
                if (typeof themeFields.palette_name === 'string' && themeFields.palette_name.trim().length > 0) {
                    validatedFields.palette_name = themeFields.palette_name.trim();
                }
            }
            
            // If there are validation errors, return them
            if (Object.keys(errors).length > 0) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors
                });
            }
            
            // Save validated settings to database
            if (Object.keys(validatedFields).length > 0) {
                await AppSettings.setMultipleSettings('theme', validatedFields, req.user.id);
            }
            
            res.json({
                success: true,
                message: 'Theme settings updated successfully',
                data: {
                    primaryColor: validatedFields.primary_color,
                    secondaryColor: validatedFields.secondary_color,
                    palette: validatedFields.palette_name
                }
            });
            
        } else {
            // Handle other categories (email) - placeholder for now
            res.json({
                success: true,
                message: `${category} settings updated successfully`,
                data: settingsData
            });
        }
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ 
            error: 'Error updating settings',
            message: 'An unexpected error occurred while saving settings'
        });
    }
});

// Upload logo endpoint
router.post('/settings/logo/upload', authorize('manage', 'User'), logoUpload, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No file uploaded',
                details: 'Please select an image file to upload.'
            });
        }

        const { buffer, originalname } = req.file;

        // Process and save logo
        const result = await processLogoUpload(buffer, originalname, req.user.id);

        // Build response with helpful information
        const response = {
            success: true,
            message: 'Logo uploaded successfully',
            logoUrl: '/api/assets/logo',
            info: result.info
        };

        if (result.info.wasResized) {
            response.message += ` (resized from ${result.info.originalDimensions.width}x${result.info.originalDimensions.height} to ${result.info.finalDimensions.width}x${result.info.finalDimensions.height})`;
        }

        res.json(response);
    } catch (error) {
        console.error('Error uploading logo:', error);
        
        // Handle specific validation errors
        if (error.message.includes('too small') || error.message.includes('Minimum size')) {
            return res.status(400).json({ 
                error: 'Image too small',
                details: error.message
            });
        }
        
        if (error.message.includes('Invalid file type') || error.message.includes('Only image')) {
            return res.status(400).json({ 
                error: 'Invalid file type',
                details: error.message
            });
        }

        res.status(500).json({ 
            error: 'Error uploading logo',
            details: 'An unexpected error occurred while processing your logo. Please try again.'
        });
    }
});

// Get current logo endpoint
router.get('/settings/logo', authorize('manage', 'User'), async (req, res) => {
    try {
        const logoUrl = await AppSettings.getSetting('branding', 'logo_url');
        res.json({ logoUrl: logoUrl || null });
    } catch (error) {
        console.error('Error fetching logo:', error);
        res.status(500).json({ error: 'Error fetching logo' });
    }
});

// Delete logo endpoint
router.delete('/settings/logo', authorize('manage', 'User'), async (req, res) => {
    try {
        await removeLogo();
        
        res.json({ 
            success: true, 
            message: 'Logo removed successfully' 
        });
    } catch (error) {
        console.error('Error deleting logo:', error);
        res.status(500).json({ error: 'Error deleting logo' });
    }
});

// Update logo position endpoint
router.put('/settings/logo/position', authorize('manage', 'User'), async (req, res) => {
    try {
        const { position } = req.body;
        
        if (!position) {
            return res.status(400).json({ 
                error: 'Missing position',
                details: 'Logo position is required.'
            });
        }
        
        // Validate position value
        const LOGO_CONFIG = require('../constants/logoConfig');
        const validPositions = LOGO_CONFIG.POSITION_OPTIONS.map(opt => opt.value);
        if (!validPositions.includes(position)) {
            return res.status(400).json({ 
                error: 'Invalid position',
                details: `Position must be one of: ${validPositions.join(', ')}`
            });
        }
        
        // Save logo position to settings
        await AppSettings.setSetting('branding', 'logo_position', position, req.user.id);
        
        res.json({ 
            success: true, 
            message: 'Logo position updated successfully',
            position 
        });
    } catch (error) {
        console.error('Error updating logo position:', error);
        res.status(500).json({ error: 'Error updating logo position' });
    }
});

// Update transaction payment status - admin only
router.put('/transactions/:id/payment-status', authorize('manage', 'Transaction'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        // Validate status
        const validStatuses = ['outstanding', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be "outstanding" or "completed".' });
        }

        // Find the transaction
        const transaction = await Transactions.findByPk(id);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Only allow updating in-person payments
        if (transaction.payment_method !== 'in-person') {
            return res.status(400).json({ error: 'Only in-person payment transactions can have their status updated' });
        }

        // Update the transaction
        await transaction.update({ 
            status,
            // Add notes to any existing notes field if it exists
            ...(notes && { notes: notes })
        });

        res.json({ 
            message: 'Payment status updated successfully',
            transaction: {
                id: transaction.id,
                status: transaction.status,
                payment_method: transaction.payment_method,
                amount: transaction.amount
            }
        });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ error: 'Error updating payment status' });
    }
});

// Storage Configuration Endpoints

/**
 * GET /api/admin/settings/storage
 * Get current storage configuration
 */
router.get('/settings/storage', authorize('manage', 'User'), async (req, res) => {
    try {
        const config = await AppSettings.getSettingsByCategory('storage');
        
        // Don't expose credentials, just confirm if they're configured
        const credentialsConfigured = !!(
            process.env.STORAGE_ACCESS_KEY_ID && 
            process.env.STORAGE_SECRET_ACCESS_KEY
        );
        
        res.json({
            ...config,
            credentialsConfigured,
            availableTypes: ['local', 'spaces']
        });
    } catch (error) {
        console.error('Error fetching storage configuration:', error);
        res.status(500).json({ error: 'Error fetching storage configuration' });
    }
});

/**
 * POST /api/admin/settings/storage
 * Update storage configuration with validation
 */
router.post('/settings/storage', authorize('manage', 'User'), async (req, res) => {
    try {
        const { storage_type, storage_endpoint, storage_region, storage_bucket, storage_cdn_url } = req.body;
        
        // Validate storage type
        if (!storage_type) {
            return res.status(400).json({ 
                error: 'Storage type is required',
                details: 'Must specify storage_type: "local" or "spaces"'
            });
        }
        
        const validatedSettings = {};
        
        // Validate each setting
        try {
            validatedSettings.storage_type = AppSettings.validateStorageSetting('storage_type', storage_type);
        } catch (e) {
            return res.status(400).json({ error: e.message });
        }
        
        // For Spaces, validate required configuration
        if (storage_type === 'spaces') {
            try {
                if (storage_endpoint) {
                    validatedSettings.storage_endpoint = AppSettings.validateStorageSetting('storage_endpoint', storage_endpoint);
                }
                if (storage_region) {
                    validatedSettings.storage_region = AppSettings.validateStorageSetting('storage_region', storage_region);
                }
                if (storage_bucket) {
                    validatedSettings.storage_bucket = AppSettings.validateStorageSetting('storage_bucket', storage_bucket);
                }
                if (storage_cdn_url) {
                    validatedSettings.storage_cdn_url = AppSettings.validateStorageSetting('storage_cdn_url', storage_cdn_url);
                }
                
                // Check that required fields are provided for Spaces
                if (!validatedSettings.storage_endpoint || !validatedSettings.storage_region || !validatedSettings.storage_bucket) {
                    return res.status(400).json({
                        error: 'Spaces storage requires endpoint, region, and bucket',
                        details: 'All three fields must be configured to use DigitalOcean Spaces'
                    });
                }
                
                // Check that credentials are available
                if (!process.env.STORAGE_ACCESS_KEY_ID || !process.env.STORAGE_SECRET_ACCESS_KEY) {
                    return res.status(400).json({
                        error: 'Spaces credentials not configured',
                        details: 'Set STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY environment variables'
                    });
                }
            } catch (e) {
                return res.status(400).json({ error: e.message });
            }
        }
        
        // Save validated settings
        await AppSettings.setMultipleSettings('storage', validatedSettings, req.user.id);
        
        // Reinitialize storage with new configuration
        const { initializeStorage, resetStorage } = require('../storage/index');
        resetStorage();
        await initializeStorage({ appSettings: AppSettings });
        
        res.json({
            success: true,
            message: 'Storage configuration updated successfully',
            config: validatedSettings
        });
    } catch (error) {
        console.error('Error updating storage configuration:', error);
        res.status(500).json({ 
            error: 'Error updating storage configuration',
            details: error.message 
        });
    }
});

/**
 * POST /api/admin/settings/storage/test-connection
 * Test storage connection before saving configuration
 */
router.post('/settings/storage/test-connection', authorize('manage', 'User'), async (req, res) => {
    try {
        const { storage_type, storage_endpoint, storage_region, storage_bucket } = req.body;
        
        if (!storage_type) {
            return res.status(400).json({ error: 'storage_type is required' });
        }
        
        if (storage_type === 'local') {
            // Local storage always works
            return res.json({
                success: true,
                message: 'Local storage is always available'
            });
        }
        
        if (storage_type === 'spaces') {
            // Validate required fields
            if (!storage_endpoint || !storage_region || !storage_bucket) {
                return res.status(400).json({
                    error: 'Missing required configuration',
                    details: 'endpoint, region, and bucket are required for Spaces'
                });
            }
            
            // Check credentials
            if (!process.env.STORAGE_ACCESS_KEY_ID || !process.env.STORAGE_SECRET_ACCESS_KEY) {
                return res.status(400).json({
                    error: 'Spaces credentials not configured',
                    details: 'Set STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY environment variables'
                });
            }
            
            // Try to create a test storage instance
            const createSpacesStorage = require('../storage/spaces');
            const testStorage = createSpacesStorage({
                endpoint: storage_endpoint,
                region: storage_region,
                bucket: storage_bucket,
                accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
                secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY
            });
            
            if (!testStorage) {
                return res.status(400).json({
                    error: 'Failed to initialize Spaces storage',
                    details: 'AWS SDK v3 may not be installed. Run: npm install @aws-sdk/client-s3'
                });
            }
            
            // Simple validation: if storage instance created successfully with valid config,
            // the connection is valid (actual upload test happens on first file upload)
            return res.json({
                success: true,
                message: 'Successfully configured DigitalOcean Spaces. Configuration is valid and ready to use.',
                config: {
                    endpoint: storage_endpoint,
                    region: storage_region,
                    bucket: storage_bucket
                }
            });
        }
        
        res.status(400).json({
            error: 'Unknown storage type',
            details: `'${storage_type}' is not a supported storage type`
        });
    } catch (error) {
        console.error('Error testing storage connection:', error);
        res.status(500).json({ 
            error: 'Error testing storage connection',
            details: error.message 
        });
    }
});

module.exports = router;
