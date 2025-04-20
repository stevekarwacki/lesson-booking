const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Update user profile
router.patch('/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        
        // Ensure user can only update their own profile
        if (userId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { name, email, password } = req.body;
        
        // Hash password if provided
        let hashedPassword;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        await User.updateUser(userId, {
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

// Update user approval status (admin only)
router.post('/:userId/approval', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can approve users' });
        }

        const { isApproved } = req.body;
        const userId = parseInt(req.params.userId, 10);

        await User.setApprovalStatus(userId, isApproved);
        res.json({ message: 'User approval status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating user approval status' });
    }
});

module.exports = router; 