const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Update user profile
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.headers['user-id'];
        
        // Ensure user can only update their own profile
        if (id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { name, email, password } = req.body;
        
        // Hash password if provided
        let hashedPassword;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        await User.updateUser(id, {
            name,
            email,
            password: hashedPassword
        });

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Error updating profile' });
    }
});

module.exports = router; 