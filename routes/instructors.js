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
        const instructors = await Instructor.getAllInstructors();
        res.json(instructors);
    } catch (error) {
        console.error('Error fetching instructors:', error);
        res.status(500).json({ error: 'Error fetching instructors' });
    }
});

// Public route - Get instructor by user ID
router.get('/user/:userId', async (req, res) => {
    try {
        const instructor = await Instructor.getInstructorByUserId(req.params.userId);
        if (!instructor) {
            return res.status(404).json({ error: 'Instructor not found' });
        }
        res.json(instructor);
    } catch (error) {
        console.error('Error fetching instructor:', error);
        res.status(500).json({ error: 'Error fetching instructor' });
    }
});

// Admin only - Create new instructor
router.post('/', isAdmin, async (req, res) => {
    try {
        // First check if user exists and isn't already an instructor
        const existingInstructor = await Instructor.getInstructorByUserId(req.body.user_id);
        if (existingInstructor) {
            return res.status(400).json({ error: 'User is already an instructor' });
        }

        const instructorId = await Instructor.createInstructor(req.body);
        
        // Update user role to 'instructor'
        await User.updateUserRole(req.body.user_id, 'instructor');
        
        res.status(201).json({ 
            message: 'Instructor created successfully',
            instructorId 
        });
    } catch (error) {
        console.error('Error creating instructor:', error);
        res.status(500).json({ error: 'Error creating instructor' });
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

// Admin only - Delete instructor
router.delete('/:userId', isAdmin, async (req, res) => {
    try {
        await Instructor.deleteInstructor(req.params.userId);
        // Reset user role back to 'student'
        await User.updateUserRole(req.params.userId, 'student');
        res.json({ message: 'Instructor removed successfully' });
    } catch (error) {
        console.error('Error deleting instructor:', error);
        res.status(500).json({ error: 'Error deleting instructor' });
    }
});

module.exports = router; 