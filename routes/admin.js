const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User } = require('../models/User');
const { Instructor } = require('../models/Instructor');
const { PaymentPlan } = require('../models/PaymentPlan');
const { Subscription } = require('../models/Subscription');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied' });
    }
};

// Get all users - now protected by isAdmin middleware
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await User.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

// Update user
router.put('/users/:id', isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { name, email, role } = req.body;
    
    try {
        await User.updateUser(userId, { name, email, role });
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating user' });
    }
});

// Delete user
router.delete('/users/:id', isAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        await User.deleteUser(userId);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Error deleting user' });
    }
});

// Update user role
router.patch('/users/:id', isAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const { role } = req.body;

        // Validate role
        const validRoles = ['student', 'instructor', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Update user role
        await User.updateUserRole(userId, role);
        
        res.json({ message: 'User role updated successfully' });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Error updating user role' });
    }
});

// Add this new route for user search
router.get('/users/search', isAdmin, async (req, res) => {
    try {
        const searchQuery = req.query.q.toLowerCase()
        const users = await User.getAllUsers()
        
        const filteredUsers = users.filter(user => 
            user.name.toLowerCase().includes(searchQuery) ||
            user.email.toLowerCase().includes(searchQuery)
        )
        
        res.json(filteredUsers)
    } catch (error) {
        console.error('Error searching users:', error)
        res.status(500).json({ error: 'Error searching users' })
    }
})

// Add new user
router.post('/users', isAdmin, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Hash password before storing
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userId = await User.createUser({
            name,
            email,
            password: hashedPassword,
            role: role || 'student'
        });

        res.status(201).json({ message: 'User created successfully', userId });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
});

// Update instructor
router.patch('/instructors/:id', isAdmin, async (req, res) => {
    try {
        const instructorId = parseInt(req.params.id, 10);
        const { hourly_rate, specialties, bio } = req.body;
        
        await Instructor.updateInstructor(instructorId, { 
            hourly_rate, 
            specialties, 
            bio 
        });
        res.json({ message: 'Instructor updated successfully' });
    } catch (error) {
        console.error('Error updating instructor:', error);
        res.status(500).json({ error: 'Error updating instructor' });
    }
});

// Delete instructor
router.delete('/instructors/:id', isAdmin, async (req, res) => {
    try {
        const instructorId = parseInt(req.params.id, 10);
        await Instructor.deleteInstructor(instructorId);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting instructor:', error);
        res.status(500).json({ error: 'Error deleting instructor' });
    }
});

// Get all payment plans
router.get('/packages', isAdmin, async (req, res) => {
    try {
        const plans = await PaymentPlan.getAll();
        res.json(plans);
    } catch (error) {
        console.error('Error fetching payment plans:', error);
        res.status(500).json({ error: 'Error fetching payment plans' });
    }
});

// Create new payment plan
router.post('/packages', isAdmin, async (req, res) => {
    try {
        const { name, price, credits, type, duration_days } = req.body;
        
        if (!name || !price || !credits || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (type === 'membership' && !duration_days) {
            return res.status(400).json({ error: 'Duration days required for membership plans' });
        }

        const plan = await PaymentPlan.create({
            name,
            price,
            credits,
            type,
            duration_days: type === 'membership' ? duration_days : null
        });

        res.status(201).json(plan);
    } catch (error) {
        console.error('Error creating payment plan:', error);
        res.status(500).json({ error: 'Error creating payment plan' });
    }
});

// Update payment plan
router.put('/packages/:id', isAdmin, async (req, res) => {
    try {
        const planId = parseInt(req.params.id, 10);
        const { name, price, credits, type, duration_days } = req.body;

        if (!name || !price || !credits || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (type === 'membership' && !duration_days) {
            return res.status(400).json({ error: 'Duration days required for membership plans' });
        }

        const plan = await PaymentPlan.findByPk(planId);
        if (!plan) {
            return res.status(404).json({ error: 'Payment plan not found' });
        }

        await plan.update({
            name,
            price,
            credits,
            type,
            duration_days: type === 'membership' ? duration_days : null
        });

        res.json(plan);
    } catch (error) {
        console.error('Error updating payment plan:', error);
        res.status(500).json({ error: 'Error updating payment plan' });
    }
});

// Delete payment plan
router.delete('/packages/:id', isAdmin, async (req, res) => {
    try {
        const planId = parseInt(req.params.id, 10);
        const plan = await PaymentPlan.findByPk(planId);
        
        if (!plan) {
            return res.status(404).json({ error: 'Payment plan not found' });
        }

        await plan.destroy();
        res.json({ message: 'Payment plan deleted successfully' });
    } catch (error) {
        console.error('Error deleting payment plan:', error);
        res.status(500).json({ error: 'Error deleting payment plan' });
    }
});

// Get user's subscription information for admin
router.get('/users/:userId/subscription', isAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        
        if (!userId) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        
        // First, check if user exists
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get all subscriptions for this user (not just active ones)
        const allSubscriptions = await Subscription.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']]
        });
        
        if (allSubscriptions.length === 0) {
            return res.status(404).json({ error: 'No subscriptions found for this user' });
        }
        
        // Get the most recent subscription
        const subscription = allSubscriptions[0];
        
        // Get the payment plan separately
        const paymentPlan = await PaymentPlan.findByPk(subscription.payment_plan_id);
        if (!paymentPlan) {
            return res.status(404).json({ error: 'Payment plan not found for subscription' });
        }
        
        // Format subscription data for admin interface
        const subscriptionData = {
            id: subscription.id,
            plan_name: paymentPlan.name,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            amount: paymentPlan.price * 100, // Convert to cents for display
            interval: paymentPlan.duration_days > 30 ? 'month' : 'week',
            cancel_at_period_end: subscription.cancel_at_period_end,
            created_at: subscription.created_at,
            updated_at: subscription.updated_at
        };
        
        res.json(subscriptionData);
    } catch (error) {
        console.error('Error fetching user subscription:', error);
        res.status(500).json({ error: 'Error fetching user subscription' });
    }
});

// Admin endpoint to cancel user subscription
router.post('/subscriptions/:subscriptionId/cancel', isAdmin, async (req, res) => {
    try {
        const subscriptionId = parseInt(req.params.subscriptionId, 10);
        
        if (!subscriptionId) {
            return res.status(400).json({ error: 'Invalid subscription ID' });
        }
        
        const subscription = await Subscription.findByPk(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // For now, redirect to the existing subscription cancellation endpoint
        // This would need to be implemented with proper admin permissions
        return res.status(501).json({ 
            error: 'Admin subscription cancellation not yet implemented',
            message: 'Use the regular subscription cancellation flow for now' 
        });
        
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ error: 'Error cancelling subscription' });
    }
});

// Admin endpoint to reactivate user subscription
router.post('/subscriptions/:subscriptionId/reactivate', isAdmin, async (req, res) => {
    try {
        const subscriptionId = parseInt(req.params.subscriptionId, 10);
        
        if (!subscriptionId) {
            return res.status(400).json({ error: 'Invalid subscription ID' });
        }
        
        const subscription = await Subscription.findByPk(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // For now, return not implemented
        return res.status(501).json({ 
            error: 'Admin subscription reactivation not yet implemented',
            message: 'This feature will be implemented in a future update' 
        });
        
    } catch (error) {
        console.error('Error reactivating subscription:', error);
        res.status(500).json({ error: 'Error reactivating subscription' });
    }
});

module.exports = router; 