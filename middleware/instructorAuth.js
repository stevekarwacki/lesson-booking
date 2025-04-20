const Instructor = require('../models/Instructor');

/**
 * Middleware to check if the authenticated user is either the instructor or an admin
 * Expects instructorId in req.params
 */
const instructorAuth = async (req, res, next) => {
    try {
        // Get all instructors and find the one we need
        const instructors = await Instructor.getAll();
        const instructor = instructors.find(i => i.id === parseInt(req.params.instructorId));
        
        if (!instructor) {
            return res.status(404).json({ error: 'Instructor not found' });
        }

        // Check if the current user is either the instructor or an admin
        if (instructor.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Attach the instructor object to the request for later use
        req.instructor = instructor;
        next();
    } catch (error) {
        console.error('Error in instructorAuth middleware:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = instructorAuth; 