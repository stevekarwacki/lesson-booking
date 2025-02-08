const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    const userId = req.headers['user-id']; // We'll replace this with proper auth later
    try {
        const user = await User.findById(userId);
        if (user && user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Access denied' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error checking admin status' });
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
    const { id } = req.params;
    const { name, email, role } = req.body;
    
    try {
        await User.updateUser(id, { name, email, role });
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating user' });
    }
});

// Delete user
router.delete('/users/:id', isAdmin, async (req, res) => {
    try {
        await User.deleteUser(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Error deleting user' });
    }
});

// Update user role
router.patch('/users/:id', isAdmin, async (req, res) => {
    try {
        await User.updateUser(req.params.id, { role: req.body.role });
        res.json({ message: 'User role updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Error updating user' });
    }
});

// Add this new route for user search
router.get('/users/search', async (req, res) => {
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

module.exports = router; 