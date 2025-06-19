const express = require('express');
const path = require('path');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const instructorRoutes = require('./routes/instructors');
const userRoutes = require('./routes/users');
const calendarRoutes = require('./routes/calendar');
const paymentsRoutes = require('./routes/payments');
const instructorAvailabilityRoutes = require('./routes/instructorAvailability');
const subscriptionsRoutes = require('./routes/subscriptions');
const { authMiddleware, adminMiddleware, instructorMiddleware } = require('./middleware/auth');
const { publishableKey } = require('./config/stripe');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Public routes
app.use('/api/auth', authRoutes);

// Public route for Stripe publishable key
app.get('/api/stripe-key', (req, res) => {
    res.json({ publishableKey });
});

// Protected routes
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);
app.use('/api/instructors', authMiddleware, instructorRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/calendar', authMiddleware, calendarRoutes);
app.use('/api/payments', authMiddleware, paymentsRoutes);
app.use('/api/availability', authMiddleware, instructorAvailabilityRoutes);
app.use('/api/subscriptions', authMiddleware, subscriptionsRoutes);

// Catch all route for Vue app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

module.exports = { app }; 