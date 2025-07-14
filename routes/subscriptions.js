const express = require('express');
const router = express.Router();
const { stripe, createSubscription, cancelSubscription, verifyWebhookSignature } = require('../config/stripe');
const { Subscription } = require('../models/Subscription');
const { SubscriptionEvent } = require('../models/SubscriptionEvent');
const { PaymentPlan } = require('../models/PaymentPlan');
const { Credits } = require('../models/Credits');
const { User } = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// Get user's subscriptions
router.get('/user/:userId', authMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        
        // Ensure user can only access their own subscriptions or user is admin
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
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
router.post('/create', authMiddleware, async (req, res) => {
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
router.post('/cancel', authMiddleware, async (req, res) => {
    try {
        const { subscriptionId } = req.body;
        
        if (!subscriptionId) {
            return res.status(400).json({ error: 'Subscription ID is required' });
        }

        // Get subscription from database
        const subscription = await Subscription.findOne({
            where: {
                id: subscriptionId,
                user_id: req.user.id
            }
        });

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        // Cancel subscription in Stripe
        const stripeSubscription = await cancelSubscription(subscription.stripe_subscription_id);

        // Update subscription in database - immediate cancellation
        await subscription.update({
            status: 'canceled',
            canceled_at: new Date()
        });

        // Record subscription event
        await SubscriptionEvent.recordEvent(subscription.id, 'subscription.canceled', stripeSubscription);

        res.json({ success: true });
    } catch (error) {
        console.error('Error canceling subscription:', error);
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
router.get('/:subscriptionId/recurring-eligibility', authMiddleware, async (req, res) => {
    try {
        const subscriptionId = parseInt(req.params.subscriptionId, 10);
        
        // Find the subscription
        const subscription = await Subscription.findByPk(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Ensure user owns this subscription or is admin
        if (subscription.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
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