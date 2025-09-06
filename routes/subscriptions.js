const express = require('express');
const router = express.Router();
const { stripe, createSubscription, cancelSubscription, verifyWebhookSignature } = require('../config/stripe');
const { Subscription } = require('../models/Subscription');
const { SubscriptionEvent } = require('../models/SubscriptionEvent');
const { PaymentPlan } = require('../models/PaymentPlan');
const { Credits } = require('../models/Credits');
const { User } = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { authorize, authorizeUserAccess, authorizeResource } = require('../middleware/permissions');

// Get user's subscriptions
router.get('/user/:userId', authMiddleware, authorizeUserAccess(async (req) => parseInt(req.params.userId)), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        
        // User access already authorized by middleware
        
        const subscriptions = await Subscription.findAll({
            where: { user_id: userId },
            include: [{
                model: PaymentPlan,
                attributes: ['id', 'name', 'type', 'price', 'duration_days']
            }],
            order: [['created_at', 'DESC']]
        });
        
        res.json(subscriptions);
    } catch (error) {
        console.error('Error fetching user subscriptions:', error);
        res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
});

// Create a new subscription
router.post('/create', authMiddleware, authorize('purchase', 'Subscription'), async (req, res) => {
    try {
        const { planId, paymentMethodId } = req.body;
        
        if (!planId || !paymentMethodId) {
            return res.status(400).json({ error: 'Plan ID and payment method ID are required' });
        }

        // Get the plan
        const plan = await PaymentPlan.findByPk(planId);
        if (!plan || plan.type !== 'membership') {
            return res.status(400).json({ error: 'Invalid membership plan' });
        }

        // Get the user from database
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create or get Stripe customer
        let customer;
        if (user.stripe_customer_id) {
            customer = await stripe.customers.retrieve(user.stripe_customer_id);
        } else {
            customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: user.id
                }
            });
            // Update user with Stripe customer ID
            await User.update(
                { stripe_customer_id: customer.id },
                { where: { id: user.id } }
            );
        }

        // Attach payment method to customer
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customer.id,
        });

        // Set as default payment method
        await stripe.customers.update(customer.id, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        // Create Stripe price if it doesn't exist
        let price;
        if (plan.stripe_price_id) {
            price = await stripe.prices.retrieve(plan.stripe_price_id);
        } else {
            price = await stripe.prices.create({
                unit_amount: Math.round(plan.price * 100),
                currency: 'usd',
                recurring: {
                    interval: 'month',
                    interval_count: Math.ceil(plan.duration_days / 30)
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

        // Create subscription
        const subscription = await createSubscription(customer.id, price.id, {
            userId: user.id,
            planId: plan.id
        });

        // Calculate period dates based on plan duration
        const now = new Date();
        const periodStart = now;
        const periodEnd = new Date(now.getTime() + (plan.duration_days * 24 * 60 * 60 * 1000));

        // Create subscription record
        const dbSubscription = await Subscription.createSubscription(
            user.id,
            plan.id,
            subscription.id,
            periodStart,
            periodEnd
        );

        // Record subscription event
        await SubscriptionEvent.recordEvent(dbSubscription.id, 'subscription.created', subscription);

        res.json({
            subscriptionId: subscription.id,
            status: subscription.status
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cancel a subscription
router.post('/cancel', authMiddleware, authorizeResource('cancel', 'Subscription', async (req) => {
    const subscription = await Subscription.findByPk(req.body.subscriptionId);
    return subscription;
}), async (req, res) => {
    try {
        const { subscriptionId } = req.body;
        const { cancelSubscriptionService } = require('../services/subscriptionCancellation');
        
        if (!subscriptionId) {
            return res.status(400).json({ error: 'Subscription ID is required' });
        }
        
        const result = await cancelSubscriptionService({
            subscriptionId,
            requestingUser: req.user,
            isAdminAction: false
        });
        
        res.json(result);
    } catch (error) {
        console.error('Error canceling subscription:', error);
        res.status(500).json({ error: error.message });
    }
});

// Preview prorated credits for subscription cancellation (without actually canceling)
router.get('/preview-cancellation/:subscriptionId', authMiddleware, authorizeResource('read', 'Subscription', async (req) => {
    const subscription = await Subscription.findByPk(req.params.subscriptionId);
    return subscription;
}), async (req, res) => {
    try {
        const subscriptionId = parseInt(req.params.subscriptionId, 10);
        
        // Get subscription from database with payment plan details
        const subscription = await Subscription.findOne({
            where: {
                id: subscriptionId
            },
            include: [{
                model: PaymentPlan,
                attributes: ['id', 'name', 'type', 'price', 'duration_days']
            }]
        });

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        // Check if subscription is already canceled
        if (subscription.status === 'canceled') {
            return res.status(400).json({ error: 'Subscription is already canceled' });
        }

        // Get current user credits
        const currentCredits = await Credits.getUserCredits(req.user.id);

        // Check for existing recurring booking
        const { RecurringBooking } = require('../models/RecurringBooking');
        const recurringBooking = await RecurringBooking.findBySubscriptionId(subscriptionId);

        // Calculate prorated credits
        const creditCalculation = await Subscription.calculateProratedCredits(subscriptionId);

        // Handle case where subscription is already cancelled in Stripe but not in local DB
        if (creditCalculation.alreadyCancelled) {
            console.log('Preview detected sync issue - subscription already cancelled in Stripe, syncing database:', subscription.stripe_subscription_id);
            
            // Clean up recurring bookings
            if (recurringBooking) {
                await recurringBooking.destroy();
                console.log('Cleaned up recurring booking during preview sync');
            }

            // Get current subscription state from Stripe to sync our database
            const { stripe } = require('../config/stripe');
            const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);

            // Update local database to match Stripe
            await subscription.update({
                status: 'canceled',
                canceled_at: creditCalculation.cancelledAt || new Date()
            });
            console.log('Updated subscription status to canceled during preview');

            // Record subscription event
            await SubscriptionEvent.recordEvent(subscription.id, 'subscription.canceled', stripeSubscription);

            // Return sync completion status
            return res.json({
                subscription: {
                    id: subscription.id,
                    status: 'canceled', // Updated status
                    created_at: subscription.created_at,
                    current_period_start: subscription.current_period_start,
                    current_period_end: subscription.current_period_end,
                    plan: subscription.PaymentPlan
                },
                currentCredits: {
                    total: currentCredits.total_credits,
                    nextExpiry: currentCredits.next_expiry
                },
                cancellationPreview: {
                    creditsToBeAwarded: 0,
                    creditsAfterCancellation: currentCredits.total_credits,
                    creditCalculation: {
                        eligible: false,
                        reason: 'Subscription status synchronized - was already cancelled in Stripe',
                        alreadyCancelled: true,
                        wasSynced: true
                    },
                    hasRecurringBooking: false, // Cleaned up
                    recurringBookingDetails: null
                },
                warnings: {
                    recurringBookingWillBeCanceled: false,
                    immediateCancel: false,
                    noRefundsToPaymentMethod: false,
                    syncCompleted: true
                }
            });
        }

        // Calculate what the user's credits will be after cancellation
        const creditsAfterCancellation = currentCredits.total_credits + (creditCalculation.eligible ? creditCalculation.credits : 0);

        res.json({
            subscription: {
                id: subscription.id,
                status: subscription.status,
                created_at: subscription.created_at,
                current_period_start: subscription.current_period_start,
                current_period_end: subscription.current_period_end,
                plan: subscription.PaymentPlan
            },
            currentCredits: {
                total: currentCredits.total_credits,
                nextExpiry: currentCredits.next_expiry
            },
            cancellationPreview: {
                creditsToBeAwarded: creditCalculation.eligible ? creditCalculation.credits : 0,
                creditsAfterCancellation,
                creditCalculation,
                hasRecurringBooking: !!recurringBooking,
                recurringBookingDetails: recurringBooking ? {
                    dayOfWeek: recurringBooking.day_of_week,
                    startSlot: recurringBooking.start_slot,
                    duration: recurringBooking.duration
                } : null
            },
            warnings: {
                recurringBookingWillBeCanceled: !!recurringBooking,
                immediateCancel: true,
                noRefundsToPaymentMethod: true
            }
        });
    } catch (error) {
        console.error('Error calculating prorated credits:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get cancellation details for a canceled subscription
router.get('/cancellation-details/:subscriptionId', authMiddleware, authorizeResource('read', 'Subscription', async (req) => {
    const subscription = await Subscription.findByPk(req.params.subscriptionId);
    return subscription;
}), async (req, res) => {
    try {
        const subscriptionId = parseInt(req.params.subscriptionId, 10);
        
        // Get subscription from database with payment plan details
        const subscription = await Subscription.findOne({
            where: {
                id: subscriptionId
            },
            include: [{
                model: PaymentPlan,
                attributes: ['id', 'name', 'type', 'price', 'duration_days']
            }]
        });

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        if (subscription.status !== 'canceled') {
            return res.status(400).json({ error: 'Subscription is not canceled' });
        }

        // Get the most recent cancellation event
        const cancellationEvent = await SubscriptionEvent.findOne({
            where: {
                subscription_id: subscriptionId,
                event_type: 'subscription.canceled'
            },
            order: [['created_at', 'DESC']]
        });

        res.json({
            subscription: {
                id: subscription.id,
                status: subscription.status,
                created_at: subscription.created_at,
                canceled_at: subscription.canceled_at,
                current_period_start: subscription.current_period_start,
                current_period_end: subscription.current_period_end,
                plan: subscription.PaymentPlan
            },
            cancellationEvent: cancellationEvent ? {
                canceled_at: cancellationEvent.created_at,
                event_details: cancellationEvent.event_data
            } : null
        });
    } catch (error) {
        console.error('Error fetching cancellation details:', error);
        res.status(500).json({ error: error.message });
    }
});

// Handle Stripe webhook events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];

    try {
        const event = verifyWebhookSignature(req.body, sig);

        // Handle the event
        switch (event.type) {
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                console.log('Webhook received subscription update:', {
                    id: subscription.id,
                    status: subscription.status,
                    current_period_start: subscription.current_period_start,
                    current_period_end: subscription.current_period_end
                });

                const dbSubscription = await Subscription.findOne({
                    where: { stripe_subscription_id: subscription.id }
                });

                if (dbSubscription) {
                    console.log('Updating database subscription:', {
                        id: dbSubscription.id,
                        old_status: dbSubscription.status,
                        new_status: subscription.status,
                        old_period_start: dbSubscription.current_period_start,
                        new_period_start: new Date(subscription.current_period_start * 1000),
                        old_period_end: dbSubscription.current_period_end,
                        new_period_end: new Date(subscription.current_period_end * 1000)
                    });

                    await dbSubscription.update({
                        status: subscription.status,
                        current_period_start: new Date(subscription.current_period_start * 1000),
                        current_period_end: new Date(subscription.current_period_end * 1000),
                        cancel_at_period_end: subscription.cancel_at_period_end
                    });

                    console.log('Database subscription updated successfully');

                    await SubscriptionEvent.recordEvent(dbSubscription.id, event.type, subscription);

                    // If subscription is active, add credits
                    if (subscription.status === 'active') {
                        const plan = await PaymentPlan.findByPk(dbSubscription.plan_id);
                        if (plan) {
                            await Credits.addCredits(
                                dbSubscription.user_id,
                                plan.credits,
                                new Date(subscription.current_period_end * 1000)
                            );
                        }
                    }
                    
                    // Clean up recurring bookings if subscription is no longer active
                    if (subscription.status !== 'active' || subscription.cancel_at_period_end) {
                        const { RecurringBooking } = require('../models/RecurringBooking');
                        await RecurringBooking.deleteBySubscriptionId(dbSubscription.id);
                        console.log('Cleaned up recurring booking for inactive subscription:', dbSubscription.id);
                    }
                }
                break;
            }
            
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                console.log('Webhook received subscription deletion:', {
                    id: subscription.id,
                    status: subscription.status
                });

                const dbSubscription = await Subscription.findOne({
                    where: { stripe_subscription_id: subscription.id }
                });

                if (dbSubscription) {
                    console.log('Cleaning up recurring booking for deleted subscription:', dbSubscription.id);
                    
                    // Clean up recurring booking
                    const { RecurringBooking } = require('../models/RecurringBooking');
                    await RecurringBooking.deleteBySubscriptionId(dbSubscription.id);
                    
                    // Update subscription status
                    await dbSubscription.update({
                        status: 'canceled'
                    });

                    await SubscriptionEvent.recordEvent(dbSubscription.id, event.type, subscription);
                    console.log('Subscription and recurring booking cleaned up successfully');
                }
                break;
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});

// Add route to update subscription periods
router.post('/update-periods', authMiddleware, async (req, res) => {
    try {
        const result = await User.updateSubscriptionPeriods(req.user.id);
        res.json(result);
    } catch (error) {
        console.error('Error updating subscription periods:', error);
        res.status(500).json({ error: 'Failed to update subscription periods' });
    }
});

// Check if subscription is eligible for recurring bookings
router.get('/:subscriptionId/recurring-eligibility', authMiddleware, authorizeResource('read', 'Subscription', async (req) => {
    const subscription = await Subscription.findByPk(req.params.subscriptionId);
    return subscription;
}), async (req, res) => {
    try {
        const subscriptionId = parseInt(req.params.subscriptionId, 10);
        
        // Find the subscription
        const subscription = await Subscription.findByPk(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Subscription ownership already verified by authorizeResource middleware
        
        // Check eligibility
        const eligibility = await Subscription.checkRecurringEligibility(subscriptionId);
        const hasExistingBooking = await Subscription.hasActiveRecurringBooking(subscriptionId);
        
        res.json({
            eligible: eligibility.eligible,
            reason: eligibility.reason,
            hasExistingRecurringBooking: hasExistingBooking,
            subscription: {
                id: subscription.id,
                status: subscription.status,
                cancel_at_period_end: subscription.cancel_at_period_end
            }
        });
        
    } catch (error) {
        console.error('Error checking recurring booking eligibility:', error);
        res.status(500).json({ error: 'Failed to check eligibility' });
    }
});

module.exports = router; 