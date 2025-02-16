const express = require('express');
const router = express.Router();
const Instructor = require('../models/Instructor');
const User = require('../models/User');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    const userId = req.headers['user-id']; // We'll replace this with proper auth later
    try {
        const user = await User.findById(userId);
        if (user && user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Access denied. Admin only.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error checking admin status' });
    }
};

// Public route - Get all instructors
router.get('/', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        const user = await User.findById(userId);
        
        // Admins can see all instructors, others only see active ones
        const instructors = user.role === 'admin' 
            ? await Instructor.getAll()
            : await Instructor.getAllActive();
            
        res.json(instructors);
    } catch (error) {
        console.error('Error fetching instructors:', error);
        res.status(500).json({ error: 'Error fetching instructors' });
    }
});

// Public route - Get instructor by user ID
router.get('/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const instructor = await Instructor.findByUserId(userId);
        
        if (!instructor) {
            return res.status(404).json({ error: 'Instructor not found' });
        }
        
        res.json(instructor);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching instructor' });
    }
});

// Add instructor
router.post('/', async (req, res) => {
    try {
        await Instructor.createInstructor(req.body);
        res.json({ message: 'Instructor added successfully' });
    } catch (error) {
        console.error('Error adding instructor:', error);
        if (error.message === 'User not found') {
            res.status(404).json({ error: error.message });
        } else if (error.message === 'User is already an instructor') {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to add instructor' });
        }
    }
});

// Admin only - Update instructor
router.put('/:userId', isAdmin, async (req, res) => {
    try {
        await Instructor.updateInstructor(req.params.userId, req.body);
        res.json({ message: 'Instructor updated successfully' });
    } catch (error) {
        console.error('Error updating instructor:', error);
        res.status(500).json({ error: 'Error updating instructor' });
    }
});

// Remove instructor
router.delete('/:id', async (req, res) => {
    try {
        await Instructor.deleteInstructor(req.params.id);
        res.json({ message: 'Instructor removed successfully' });
    } catch (error) {
        console.error('Error removing instructor:', error);
        res.status(500).json({ error: 'Failed to remove instructor' });
    }
});

// Add new route for toggling active status (admin only)
router.patch('/:id/toggle-active', async (req, res) => {
    try {
        const { id } = req.params;
        await Instructor.toggleActive(id);
        res.json({ message: 'Instructor active status updated successfully' });
    } catch (error) {
        console.error('Error updating instructor active status:', error);
        res.status(500).json({ error: 'Error updating instructor active status' });
    }
});

module.exports = router; 