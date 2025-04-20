const express = require('express');
const router = express.Router();
const PaymentPlan = require('../models/PaymentPlan');
const Credits = require('../models/Credits');
const Transactions = require('../models/Transactions');

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
    const { planId, paymentMethod } = req.body;
    
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

module.exports = router;