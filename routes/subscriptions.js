const express = require('express');
const router = express.Router();
const { stripe, createSubscription, cancelSubscription, verifyWebhookSignature } = require('../config/stripe');
const { Subscription } = require('../models/Subscription');
const { SubscriptionEvent } = require('../models/SubscriptionEvent');
const { PaymentPlan } = require('../models/PaymentPlan');
const { Credits } = require('../models/Credits');
const { User } = require('../models/User');

// Create a new subscription
router.post('/create', async (req, res) => {
    try {
        const { planId } = req.body;
        
        if (!planId) {
            return res.status(400).json({ error: 'Plan ID is required' });
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

        // Get the payment intent from the latest invoice
        const invoice = subscription.latest_invoice;
        let clientSecret;

        if (invoice && invoice.payment_intent) {
            clientSecret = invoice.payment_intent.client_secret;
        } else {
            // If no payment intent exists, create one
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(plan.price * 100),
                currency: 'usd',
                customer: customer.id,
                payment_method_types: ['card'],
                metadata: {
                    subscriptionId: subscription.id,
                    userId: user.id,
                    planId: plan.id
                }
            });
            clientSecret = paymentIntent.client_secret;
        }

        // Create subscription record
        const dbSubscription = await Subscription.createSubscription(
            user.id,
            plan.id,
            subscription.id,
            new Date(subscription.current_period_start * 1000),
            new Date(subscription.current_period_end * 1000)
        );

        // Record subscription event
        await SubscriptionEvent.recordEvent(dbSubscription.id, 'subscription.created', subscription);

        res.json({
            subscriptionId: subscription.id,
            clientSecret
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cancel a subscription
router.post('/cancel', async (req, res) => {
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

        // Update subscription in database
        await subscription.update({
            cancel_at_period_end: true,
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
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const dbSubscription = await Subscription.findOne({
                    where: { stripe_subscription_id: subscription.id }
                });

                if (dbSubscription) {
                    await dbSubscription.update({
                        status: subscription.status,
                        current_period_start: new Date(subscription.current_period_start * 1000),
                        current_period_end: new Date(subscription.current_period_end * 1000),
                        cancel_at_period_end: subscription.cancel_at_period_end
                    });

                    await SubscriptionEvent.recordEvent(dbSubscription.id, event.type, subscription);

                    // If subscription is active, add credits
                    if (subscription.status === 'active') {
                        const plan = await PaymentPlan.findByPk(dbSubscription.payment_plan_id);
                        if (plan) {
                            await Credits.addCredits(
                                dbSubscription.user_id,
                                plan.credits,
                                new Date(subscription.current_period_end * 1000)
                            );
                        }
                    }
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

module.exports = router; 