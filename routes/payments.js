const express = require('express');
const router = express.Router();
const Credits = require('../models/Credits');

router.get('/credits', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const credits = await Credits.getUserCredits(userId);
        res.json(credits);
    } catch (error) {
        console.error('Error in /credits endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;