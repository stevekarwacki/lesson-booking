const express = require('express');
const router = express.Router();
const { Instructor } = require('../models/Instructor');
const { authorize, authorizeResource } = require('../middleware/permissions');

// Get all instructors - public route for active instructors, admin for all
router.get('/', async (req, res) => {
    try {
        // Use CASL to determine if user can see all instructors
        const userAbility = req.userAbility;
        const canManageInstructors = userAbility && userAbility.can('manage', 'Instructor');
        
        const instructors = canManageInstructors 
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

// Get instructor by user ID - admin or instructor themselves
router.get('/user/:userId', authorizeResource('read', 'Instructor', async (req) => {
    return await Instructor.findByUserId(parseInt(req.params.userId));
}), async (req, res) => {
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
router.post('/', authorize('create', 'Instructor'), async (req, res) => {
    try {
        // CASL middleware already verified permissions

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
router.put('/:id', authorizeResource('update', 'Instructor', async (req) => {
    return await Instructor.findByPk(parseInt(req.params.id));
}), async (req, res) => {
    try {
        // CASL middleware already verified permissions

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
router.delete('/:id', authorizeResource('delete', 'Instructor', async (req) => {
    return await Instructor.findByPk(parseInt(req.params.id));
}), async (req, res) => {
    try {
        // CASL middleware already verified permissions

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
router.patch('/:id/toggle-active', authorizeResource('update', 'Instructor', async (req) => {
    return await Instructor.findByPk(parseInt(req.params.id));
}), async (req, res) => {
    try {
        // CASL middleware already verified permissions

        const instructorId = parseInt(req.params.id, 10);
        
        // Toggle using instructor's database ID directly
        await Instructor.toggleActive(instructorId);
        res.json({ message: 'Instructor active status updated successfully' });
    } catch (error) {
        console.error('Error updating instructor active status:', error);
        res.status(500).json({ error: 'Error updating instructor active status' });
    }
});

// =============================================================================
// FUTURE FUNCTIONALITY PLACEHOLDERS - Instructor Student Management
// =============================================================================
// WARNING: These routes are placeholders for future instructor student management
// functionality. Do not remove unless certain they will not be implemented.

/**
 * Get all students assigned to the current instructor
 * @route GET /api/instructors/students
 * @access Instructor only
 * @future This will return a list of students who have bookings with this instructor
 */
// router.get('/students', async (req, res) => {
//     // Future implementation for instructors to view their assigned students
// });

/**
 * Get all bookings for a specific student (instructor access)
 * @route GET /api/instructors/students/:userId/bookings
 * @param {number} userId - Student's user database ID
 * @access Instructor only (restricted to their own students)
 * @future This will support filtering (upcoming/past/cancelled) and pagination
 */
// router.get('/students/:userId/bookings', async (req, res) => {
//     // Future implementation for instructors to view their student's bookings
// });

/**
 * Update/reschedule a booking for their student
 * @route PATCH /api/instructors/students/:userId/bookings/:bookingId
 * @param {number} userId - Student's user database ID
 * @param {number} bookingId - Booking's database ID
 * @access Instructor only (restricted to their own students and bookings)
 * @future This will handle booking rescheduling initiated by instructor
 */
// router.patch('/students/:userId/bookings/:bookingId', async (req, res) => {
//     // Future implementation for instructors to reschedule student bookings
// });

/**
 * Cancel a booking for their student
 * @route DELETE /api/instructors/students/:userId/bookings/:bookingId
 * @param {number} userId - Student's user database ID
 * @param {number} bookingId - Booking's database ID
 * @access Instructor only (restricted to their own students and bookings)
 * @future This will handle booking cancellation with proper authorization checks
 */
// router.delete('/students/:userId/bookings/:bookingId', async (req, res) => {
//     // Future implementation for instructors to cancel student bookings
// });

module.exports = router; 