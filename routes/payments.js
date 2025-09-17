const express = require('express');
const router = express.Router();
const { PaymentPlan } = require('../models/PaymentPlan');
const { Credits } = require('../models/Credits');
const { Transactions } = require('../models/Transactions');
const { createPaymentIntent, verifyWebhookSignature } = require('../config/stripe');
const { authorize } = require('../middleware/permissions');

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

// Get a specific payment plan by ID
router.get('/plans/:id', async (req, res) => {
    try {
        const plan = await PaymentPlan.getById(req.params.id);
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }
        res.json(plan);
    } catch (error) {
        console.error('Error fetching payment plan:', error);
        res.status(500).json({ error: 'Failed to fetch payment plan' });
    }
});

// Get user credits - authenticated users only
router.get('/credits', authorize('read', 'Credits'), async (req, res) => {
    try {
        const credits = await Credits.getUserCredits(req.user.id);
        res.json(credits);
    } catch (error) {
        console.error('Error fetching user credits:', error);
        res.status(500).json({ error: 'Failed to fetch user credits' });
    }
});

// Purchase a plan - authenticated users only
router.post('/purchase', authorize('create', 'Purchase'), async (req, res) => {
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

// Get user transactions - authenticated users only
router.get('/transactions', authorize('read', 'Transaction'), async (req, res) => {
    try {
        const transactions = await Transactions.getTransactions(req.user.id);
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Create a payment intent for Stripe - authenticated users only
router.post('/create-payment-intent', authorize('create', 'Purchase'), async (req, res) => {
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
                
                // Find the pending transaction
                const pendingTransaction = await Transactions.findOne({
                    where: { 
                        payment_intent_id: paymentIntent.id,
                        status: 'pending'
                    }
                });

                if (pendingTransaction) {
                    // Complete the purchase through PaymentPlan.purchase
                    try {
                        await PaymentPlan.purchase(
                            pendingTransaction.user_id,
                            pendingTransaction.payment_plan_id,
                            'stripe',
                            paymentIntent.id
                        );
                        
                        // Update original transaction to completed
                        await pendingTransaction.update({ status: 'completed' });
                        
                        console.log(`Stripe payment completed for user ${pendingTransaction.user_id}, plan ${pendingTransaction.payment_plan_id}`);
                    } catch (error) {
                        console.error('Error completing Stripe purchase:', error);
                        await pendingTransaction.update({ status: 'failed' });
                    }
                } else {
                    console.warn(`No pending transaction found for payment intent ${paymentIntent.id}`);
                }
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