const express = require('express');
const path = require('path');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const instructorRoutes = require('./routes/instructors');
const userRoutes = require('./routes/users');
const calendarRoutes = require('./routes/calendar');
const paymentsRoutes = require('./routes/payments');
const instructorAvailabilityRoutes = require('./routes/instructorAvailability');
const User = require('./models/User');
const Instructor = require('./models/Instructor');
const instructorAvailability = require('./models/InstructorAvailability');
const Calendar = require('./models/Calendar');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Initialize database tables
Promise.all([
    User.createUsersTable(),
    Instructor.createInstructorsTable(),
    instructorAvailability.createAvailabilityTables(),
    Calendar.createCalendarTable()
])
.then(() => {
    console.log('All tables initialized');
})
.catch(err => {
    console.error('Database initialization failed:', err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/instructors', instructorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/availability', instructorAvailabilityRoutes);

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