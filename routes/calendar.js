const express = require('express');
const router = express.Router();
const { Calendar } = require('../models/Calendar');

// Get instructor's calendar events
router.get('/instructor/:instructorId', async (req, res) => {
    try {
        const events = await Calendar.getInstructorEvents(req.params.instructorId);
        res.json(events);
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({ error: 'Error fetching calendar events' });
    }
});

// Create new calendar event (instructor only)
router.post('/', async (req, res) => {
    try {
        const eventId = await Calendar.createEvent(req.body);
        res.status(201).json({ 
            message: 'Event created successfully',
            eventId 
        });
    } catch (error) {
        console.error('Error creating calendar event:', error);
        res.status(500).json({ error: 'Error creating calendar event' });
    }
});

// Update calendar event (instructor only)
router.patch('/:eventId', async (req, res) => {
    try {
        await Calendar.updateEvent(req.params.eventId, req.body);
        res.json({ message: 'Event updated successfully' });
    } catch (error) {
        console.error('Error updating calendar event:', error);
        res.status(500).json({ error: 'Error updating calendar event' });
    }
});

// Delete calendar event (instructor only)
router.delete('/:eventId', async (req, res) => {
    try {
        await Calendar.deleteEvent(req.params.eventId);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting calendar event:', error);
        res.status(500).json({ error: 'Error deleting calendar event' });
    }
});

// Book a slot (student)
router.post('/:eventId/book', async (req, res) => {
    try {
        await Calendar.updateEvent(req.params.eventId, {
            ...req.body,
            status: 'booked',
            student_id: req.headers['user-id']
        });
        res.json({ message: 'Lesson booked successfully' });
    } catch (error) {
        console.error('Error booking lesson:', error);
        res.status(500).json({ error: 'Error booking lesson' });
    }
});

module.exports = router; 