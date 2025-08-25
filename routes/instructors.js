const express = require('express');
const router = express.Router();
const { Instructor } = require('../models/Instructor');

// Get all instructors
router.get('/', async (req, res) => {
    try {
        // Admins can see all instructors, others only see active ones
        const instructors = req.user.role === 'admin' 
            ? await Instructor.getAll()
            : await Instructor.getAllActive();
            
        res.json(instructors);
    } catch (error) {
        console.error('Error fetching instructors:', error);
        res.status(500).json({ error: 'Error fetching instructors' });
    }
});

// Get current user's instructor profile
router.get('/me', async (req, res) => {
    try {
        const instructor = await Instructor.findByUserId(req.user.id);
        
        if (!instructor) {
            return res.status(404).json({ error: 'Instructor profile not found' });
        }
        
        res.json(instructor);
    } catch (error) {
        console.error('Error fetching instructor profile:', error);
        res.status(500).json({ error: 'Error fetching instructor profile' });
    }
});

// Get instructor by user ID
router.get('/user/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        const instructor = await Instructor.findByUserId(userId);
        
        if (!instructor) {
            return res.status(404).json({ error: 'Instructor not found' });
        }
        
        res.json(instructor);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching instructor' });
    }
});

// Get instructor by ID (public route for booking)
router.get('/:id', async (req, res) => {
    try {
        const instructorId = parseInt(req.params.id, 10);
        const instructor = await Instructor.findByPk(instructorId, {
            include: [{
                model: require('../models/User').User,
                attributes: ['name', 'email']
            }]
        });
        
        if (!instructor) {
            return res.status(404).json({ error: 'Instructor not found' });
        }
        
        res.json(instructor);
    } catch (error) {
        console.error('Error fetching instructor:', error);
        res.status(500).json({ error: 'Error fetching instructor' });
    }
});

// Add instructor (admin only)
router.post('/', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        }

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

// Update instructor (admin only)
router.put('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        }

        const instructorId = parseInt(req.params.id, 10);
        
        // Update using instructor's database ID directly
        await Instructor.updateInstructor(instructorId, req.body);
        res.json({ message: 'Instructor updated successfully' });
    } catch (error) {
        console.error('Error updating instructor:', error);
        res.status(500).json({ error: 'Error updating instructor' });
    }
});

// Remove instructor (admin only)
router.delete('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        }

        const instructorId = parseInt(req.params.id, 10);
        
        // Delete using instructor's database ID directly
        await Instructor.deleteInstructor(instructorId);
        res.json({ message: 'Instructor removed successfully' });
    } catch (error) {
        console.error('Error removing instructor:', error);
        res.status(500).json({ error: 'Failed to remove instructor' });
    }
});

// Toggle active status (admin only)
router.patch('/:id/toggle-active', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        }

        const instructorId = parseInt(req.params.id, 10);
        
        // Toggle using instructor's database ID directly
        await Instructor.toggleActive(instructorId);
        res.json({ message: 'Instructor active status updated successfully' });
    } catch (error) {
        console.error('Error updating instructor active status:', error);
        res.status(500).json({ error: 'Error updating instructor active status' });
    }
});

module.exports = router; 