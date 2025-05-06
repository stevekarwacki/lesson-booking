const express = require('express');
const router = express.Router();
const { PaymentPlan } = require('../models/PaymentPlan');
const { Credits } = require('../models/Credits');
const { Transactions } = require('../models/Transactions');
const { createPaymentIntent, verifyWebhookSignature } = require('../config/stripe');

// Public route - Get all payment plans
router.get('/plans', async (req, res) => {
    try {
        const plans = await PaymentPlan.getAll();
        res.json(plans);
    } catch (error) {
        console.error('Error fetching payment plans:', error);
        res.status(500).json({ error: 'Failed to fetch payment plans' });
    }
});

// Get user credits
router.get('/credits', async (req, res) => {
    try {
        const credits = await Credits.getUserCredits(req.user.id);
        res.json(credits);
    } catch (error) {
        console.error('Error fetching user credits:', error);
        res.status(500).json({ error: 'Failed to fetch user credits' });
    }
});

// Purchase a plan
router.post('/purchase', async (req, res) => {
    const { planId, paymentMethod = 'credits' } = req.body;
    
    if (!planId) {
        return res.status(400).json({ error: 'Plan ID is required' });
    }

    if (!paymentMethod) {
        return res.status(400).json({ error: 'Payment method is required' });
    }
    
    try {
        const result = await PaymentPlan.purchase(req.user.id, planId, paymentMethod);
        res.json(result);
    } catch (error) {
        console.error('Error processing purchase:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user transactions
router.get('/transactions', async (req, res) => {
    try {
        const transactions = await Transactions.getTransactions(req.user.id);
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Create a payment intent for Stripe
router.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, planId } = req.body
        
        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' })
        }

        // Create a transaction record first
        const transaction = await Transactions.create({
            user_id: req.user.id,
            payment_plan_id: planId,
            amount: amount, // Convert from cents to dollars
            payment_method: 'stripe',
            status: 'pending'
        })

        const paymentIntent = await createPaymentIntent(amount, 'usd', {
            userId: req.user.id,
            planId,
            transactionId: transaction.id
        })

        // Update transaction with payment intent ID
        await transaction.update({
            payment_intent_id: paymentIntent.id
        })

        res.json({
            clientSecret: paymentIntent.client_secret
        })
    } catch (error) {
        console.error('Error creating payment intent:', error)
        res.status(500).json({ error: 'Failed to create payment intent' })
    }
});

// Handle Stripe webhooks
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    try {
        const event = verifyWebhookSignature(req.body, signature);
        
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                // Update transaction status
                await Transactions.update(
                    { status: 'completed' },
                    { 
                        where: { 
                            payment_intent_id: paymentIntent.id 
                        } 
                    }
                );
                break;
                
            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                // Update transaction status
                await Transactions.update(
                    { status: 'failed' },
                    { 
                        where: { 
                            payment_intent_id: failedPayment.id 
                        } 
                    }
                );
                break;
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({ error: 'Webhook error' });
    }
});

module.exports = router;