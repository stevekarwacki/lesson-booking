const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

try {
    // Validate Stripe configuration
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }

    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
        throw new Error('STRIPE_PUBLISHABLE_KEY is not defined in environment variables');
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not defined in environment variables');
    }
} catch (error) {
    console.error('Stripe configuration error:', error);
}

// Helper function to create a payment intent
async function createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency,
            metadata,
            automatic_payment_methods: {
                enabled: true,
            },
        });
        return paymentIntent;
    } catch (error) {
        console.error('Error creating payment intent:', error);
        throw error;
    }
}

// Helper function to create a subscription
async function createSubscription(customerId, priceId, metadata = {}) {
    try {
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            metadata,
            payment_settings: { save_default_payment_method: 'on_subscription' },
            collection_method: 'charge_automatically'
        });

        return subscription;
    } catch (error) {
        console.error('Error creating subscription:', error);
        throw error;
    }
}

// Helper function to cancel a subscription
async function cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    try {
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: cancelAtPeriodEnd
        });
        return subscription;
    } catch (error) {
        console.error('Error canceling subscription:', error);
        throw error;
    }
}

// Helper function to verify webhook signature
function verifyWebhookSignature(payload, signature) {
    try {
        return stripe.webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        console.error('Webhook signature verification failed:', error);
        throw error;
    }
}

module.exports = {
    stripe,
    createPaymentIntent,
    createSubscription,
    cancelSubscription,
    verifyWebhookSignature,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
}; 