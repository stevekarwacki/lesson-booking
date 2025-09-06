const express = require('express');
const router = express.Router();
const { User } = require('../models/User');
const bcrypt = require('bcrypt');
const { authorize, authorizeUserAccess } = require('../middleware/permissions');

// Update user profile - user can update their own, admin can update any
router.patch('/:id', authorizeUserAccess(async (req) => parseInt(req.params.id)), async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        // CASL middleware already verified permissions

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
router.post('/:userId/approval', authorize('manage', 'User'), async (req, res) => {
    try {
        // CASL middleware already verified permissions

        const { isApproved } = req.body;
        const userId = parseInt(req.params.userId, 10);

        await User.setApprovalStatus(userId, isApproved);
        res.json({ message: 'User approval status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating user approval status' });
    }
});

module.exports = router; 