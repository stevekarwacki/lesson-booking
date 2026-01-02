const express = require('express');
const router = express.Router();
const { User } = require('../models/User');
const bcrypt = require('bcrypt');
const { authorize, authorizeUserAccess } = require('../middleware/permissions');
const { canUserUseInPersonPayment } = require('../utils/inPersonPaymentUtils');
const { authMiddleware } = require('../middleware/auth');
const { defineAbilitiesFor } = require('../utils/abilities');

// Get all students (for instructors/admins booking on behalf)
router.get('/students', authMiddleware, async (req, res) => {
    try {
        // Define abilities for the user
        const ability = defineAbilitiesFor(req.user);
        
        // Check if user has permission to read student list (instructors) or manage users (admins)
        if (!ability.can('read', 'StudentList') && !ability.can('manage', 'User')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        const allUsers = await User.getAllUsers();
        const students = allUsers.filter(user => user.role === 'student');
        
        res.json({ users: students });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Error fetching students' });
    }
});

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

// Get current user's payment options (requires authentication)
router.get('/me/payment-options', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user data to check override setting
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if user can use in-person payment
        const canUseInPersonPayment = await canUserUseInPersonPayment(user);
        
        res.json({
            canUseInPersonPayment
        });
    } catch (error) {
        console.error('Error fetching user payment options:', error);
        res.status(500).json({ error: 'Error fetching payment options' });
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

// Get a user's credit balance (admin/instructor only, for booking on behalf)
router.get('/:userId/credits', authMiddleware, async (req, res) => {
    try {
        // Define abilities for the user
        const ability = defineAbilitiesFor(req.user);
        
        // Check if user has permission to read student credits (instructors) or manage users (admins)
        if (!ability.can('read', 'StudentCredits') && !ability.can('manage', 'User')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        const userId = parseInt(req.params.userId, 10);
        const duration = req.query.duration ? parseInt(req.query.duration) : 30;
        
        // Import UserCredits model
        const { UserCredits } = require('../models/Credits');
        
        // Get credits breakdown by duration
        const breakdown = await UserCredits.getUserCreditsBreakdown(userId);
        
        // Extract credits for the requested duration
        const availableCredits = breakdown[duration]?.credits || 0;
        
        res.json({
            availableCredits,
            duration
        });
    } catch (error) {
        console.error('Error fetching user credits:', error);
        res.status(500).json({ error: 'Error fetching user credits' });
    }
});

module.exports = router; 