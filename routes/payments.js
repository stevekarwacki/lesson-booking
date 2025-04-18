const express = require('express');
const router = express.Router();
const PaymentPlan = require('../models/PaymentPlan');
const Credits = require('../models/Credits');
const Transactions = require('../models/Transactions');

router.get('/plans', async (req, res) => {
    try {
        const plans = await PaymentPlan.getAll();
        res.json(plans);
    } catch (error) {
        console.error('Error fetching payment plans:', error);
        res.status(500).json({ error: 'Failed to fetch payment plans' });
    }
});

router.get('/credits', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const credits = await Credits.getUserCredits(userId);
        res.json(credits);
    } catch (error) {
        console.error('Error fetching user credits:', error);
        res.status(500).json({ error: 'Failed to fetch user credits' });
    }
});

router.post('/purchase', async (req, res) => {
    const { planId, paymentMethod } = req.body;
    const userId = req.headers['user-id'];
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const result = await PaymentPlan.purchase(userId, planId, paymentMethod);
        res.json(result);
    } catch (error) {
        console.error('Error processing purchase:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/transactions', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const transactions = await Transactions.getTransactions(userId);
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

module.exports = router;