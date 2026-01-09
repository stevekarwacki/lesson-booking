const express = require('express');
const router = express.Router();
const { User } = require('../models/User');
const bcrypt = require('bcrypt');
const { authorize, authorizeAny, authorizeUserAccess } = require('../middleware/permissions');
const { canUserUseInPersonPayment } = require('../utils/inPersonPaymentUtils');
const { error: logError } = require('../utils/logger');

// Get all students (for instructors/admins booking on behalf)
router.get('/students', authorizeAny([
    { action: 'read', subject: 'StudentList' },
    { action: 'manage', subject: 'User' }
]), async (req, res) => {
    try {
        const allUsers = await User.getAllUsers();
        const students = allUsers.filter(user => user.role === 'student');
        
        res.json({ users: students });
    } catch (err) {
        logError('Error fetching students', { error: err.message, userId: req.user?.id });
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

// Update current user's verification data
router.put('/me/verification', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Validate incoming data
        const validation = User.validateVerificationData(req.body);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                errors: validation.errors 
            });
        }
        
        // Build profile data JSON
        const profileData = User.buildProfileData(req.body);
        
        // Prepare updates
        const updates = {
            phone_number: req.body.phone_number?.trim(),
            is_student_minor: req.body.is_student_minor,
            user_profile_data: profileData
        };
        
        // Update user
        await User.updateUser(userId, updates);
        
        // Fetch updated user to check if verification is now complete
        const updatedUser = await User.findById(userId);
        const complete = User.isVerificationComplete(updatedUser);
        
        // Set completion timestamp if verification is complete
        if (complete && !updatedUser.profile_completed_at) {
            await User.updateUser(userId, { profile_completed_at: new Date() });
        }
        
        // Fetch final user state and return with verification status
        const finalUser = await User.findById(userId);
        const userData = User.getPlainObject(finalUser);
        
        res.json({
            message: 'Verification data updated successfully',
            verification_status: userData.verification_status
        });
    } catch (error) {
        logError('Error updating verification data', { 
            error: error.message, 
            userId: req.user?.id 
        });
        res.status(500).json({ error: 'Error updating verification data' });
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
router.get('/:userId/credits', authorizeAny([
    { action: 'read', subject: 'StudentCredits' },
    { action: 'manage', subject: 'User' }
]), async (req, res) => {
    try {
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
    } catch (err) {
        logError('Error fetching user credits', { error: err.message, userId, requestedBy: req.user?.id });
        res.status(500).json({ error: 'Error fetching user credits' });
    }
});

module.exports = router; 