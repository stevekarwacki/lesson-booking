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

// Update user approval status (admin only)
router.post('/:userId/approval', async (req, res) => {
    try {
        const { isApproved } = req.body;
        const userId = req.params.userId;
        const adminId = req.headers['user-id'];

        // Check if user is admin
        const admin = await User.findById(adminId);
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can approve users' });
        }

        await User.setApprovalStatus(userId, isApproved);
        res.json({ message: 'User approval status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating user approval status' });
    }
});

module.exports = router; 