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
        // throw new Error('Failed to create payment intent');
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
        // throw new Error('Invalid webhook signature');
    }
}

module.exports = {
    stripe,
    createPaymentIntent,
    verifyWebhookSignature,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
}; 