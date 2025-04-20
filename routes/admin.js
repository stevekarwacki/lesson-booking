const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const Instructor = require('../models/Instructor');

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
        const users = await User.findAll();
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
        const users = await User.findAll()
        
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

module.exports = router; 