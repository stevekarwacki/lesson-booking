const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Secret key for JWT - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    
    // Add logging to debug
    console.log('Received signup request:', { name, email });
    
    if (!name || !email || !password) {
        console.log('Missing required fields');
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await User.createUser({
            name,
            email,
            password: hashedPassword
        });

        console.log('User created successfully:', userId);
        
        // Create token for new user
        const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '24h' });
        
        // Return user data and token
        res.json({
            message: 'User created successfully',
            token,
            user: {
                id: userId,
                name,
                email,
                role: 'student'
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        return res.status(500).json({ 
            error: 'Error creating user',
            details: error.message 
        });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await User.findByEmail(email);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
        
        // Don't send password back to client
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            message: 'Login successful',
            token,
            user: userWithoutPassword
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error during login' });
    }
});

// Route to get current user data
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Error fetching user data' });
    }
});

module.exports = router; 