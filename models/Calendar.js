const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');
const { User } = require('./User');
const { Instructor } = require('./Instructor');
const { Credits } = require('./Credits');
const { 
    isValidSlot,
    isValidDateString,
    getCurrentDateUTC
} = require('../utils/timeUtils');

const Calendar = sequelize.define('Calendar', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    instructor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'instructors',
            key: 'id'
        }
    },
    student_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    start_slot: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 0,
            max: 95
        }
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        }
    },
    status: {
        type: DataTypes.ENUM('booked', 'blocked', 'cancelled'),
        allowNull: false,
        defaultValue: 'booked'
    }
}, {
    tableName: 'calendar_events',
    timestamps: false
});

// Associations
Calendar.belongsTo(Instructor, { foreignKey: 'instructor_id' });
Calendar.belongsTo(User, { foreignKey: 'student_id', as: 'student' });

// Static methods
Calendar.addEvent = async function(instructorId, studentId, date, startSlot, duration, status = 'booked', paymentMethod = 'credits') {
    try {
        // Validate inputs using UTC utilities
        if (!isValidDateString(date)) {
            throw new Error('Invalid date format. Expected YYYY-MM-DD.');
        }
        
        if (!isValidSlot(startSlot)) {
            throw new Error('Invalid start slot. Must be between 0 and 95.');
        }
        
        if (!Number.isInteger(duration) || duration < 1) {
            throw new Error('Invalid duration. Must be a positive integer.');
        }
        
        if (startSlot + duration > 96) {
            throw new Error('Event duration exceeds daily slot limit.');
        }

        // Date is already in UTC format (YYYY-MM-DD string)
        const utcDate = date;

        // Check if user has sufficient credits if using credits
        if (paymentMethod === 'credits') {
            const hasCredits = await Credits.hasSufficientCredits(studentId);
            if (!hasCredits) {
                throw new Error('INSUFFICIENT_CREDITS');
            }
        }

        // Create the event
        const event = await this.create({
            instructor_id: instructorId,
            student_id: studentId,
            date: utcDate,
            start_slot: startSlot,
            duration,
            status
        });

        // If using credits, deduct them
        if (paymentMethod === 'credits') {
            try {
                await Credits.useCredit(studentId, event.id);
            } catch (error) {
                // If credit deduction fails, rollback the booking
                await event.destroy();
                throw error;
            }
        }

        return event;
    } catch (error) {
        console.error('Error in addEvent:', error);
        throw error;
    }
};

Calendar.getInstructorEvents = async function(instructorId) {
    return this.findAll({
        where: { 
            instructor_id: instructorId,
            status: { [sequelize.Op.ne]: 'cancelled' }
        },
        include: [
            {
                model: User,
                as: 'student',
                attributes: ['name']
            },
            {
                model: Instructor,
                include: [{
                    model: User,
                    attributes: ['name']
                }]
            }
        ],
        order: [['date', 'ASC'], ['start_slot', 'ASC']]
    });
};

Calendar.updateEvent = async function(eventId, updates) {
    const event = await this.findByPk(eventId);
    if (!event) {
        throw new Error('Event not found');
    }
    await event.update(updates);
    return event;
};

Calendar.deleteEvent = async function(eventId) {
    const event = await this.findByPk(eventId);
    if (!event) {
        throw new Error('Event not found');
    }
    await event.destroy();
};

Calendar.getStudentEvents = async function(studentId) {
    // Use UTC date for comparison to ensure consistent filtering
    const currentDateUTC = getCurrentDateUTC();
    
    return this.findAll({
        where: {
            student_id: studentId,
            date: {
                [sequelize.Op.gte]: currentDateUTC
            },
            status: { [sequelize.Op.ne]: 'cancelled' }
        },
        include: [{
            model: Instructor,
            include: [{
                model: User,
                attributes: ['name']
            }]
        }],
        order: [['date', 'ASC'], ['start_slot', 'ASC']]
    });
};

Calendar.getEventById = async function(eventId) {
    return this.findByPk(eventId, {
        include: [
            {
                model: User,
                as: 'student',
                attributes: ['id', 'name', 'email']
            },
            {
                model: Instructor,
                include: [{
                    model: User,
                    attributes: ['name']
                }]
            }
        ]
    });
};

module.exports = { Calendar }; 