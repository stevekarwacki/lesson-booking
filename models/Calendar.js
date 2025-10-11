const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');
const { User } = require('./User');
const { Instructor } = require('./Instructor');
const { UserCredits } = require('./Credits');
const { 
    isValidSlot,
    isValidDateString,
    getCurrentDateUTC
} = require('../utils/timeUtils');

// Time slot constants
const MAX_SLOT_INDEX = 95; // 0-95 slots per day (24 hours * 4 slots per hour - 1)
const emailQueueService = require('../services/EmailQueueService');

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
            max: MAX_SLOT_INDEX
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
        
        if (startSlot + duration > MAX_SLOT_INDEX + 1) {
            throw new Error('Event duration exceeds daily slot limit.');
        }

        // Date is already in UTC format (YYYY-MM-DD string)
        const utcDate = date;

        // Check if user has sufficient credits if using credits (outside transaction for early validation)
        if (paymentMethod === 'credits') {
            const durationMinutes = duration * 15; // Convert slots to minutes (each slot = 15 minutes)
            const hasCredits = await UserCredits.hasSufficientCredits(studentId, durationMinutes);
            if (!hasCredits) {
                throw new Error('INSUFFICIENT_CREDITS');
            }
        }

        // For in-person payments, we need to calculate the amount and create a transaction record
        let transactionAmount = null;
        if (paymentMethod === 'in-person') {
            // Get instructor's rate to calculate the amount
            const { Instructor } = require('./Instructor');
            const instructor = await Instructor.findOne({ where: { user_id: instructorId } });
            const rate = instructor?.hourly_rate || 50; // Fallback to $50 if no rate set
            
            // Rate represents 30-minute lesson cost, so 60-minute lessons cost double
            const durationMinutes = duration * 15;
            transactionAmount = durationMinutes === 30 ? rate : rate * 2;
        }

        // Use transaction to ensure atomicity of event creation and credit deduction
        const transaction = await sequelize.transaction();
        let event; // Declare event outside transaction scope
        
        try {
            // Create the event
            event = await this.create({
                instructor_id: instructorId,
                student_id: studentId,
                date: utcDate,
                start_slot: startSlot,
                duration,
                status
            }, { transaction });

            // If using credits, deduct them within the same transaction
            if (paymentMethod === 'credits') {
                const durationMinutes = duration * 15; // Convert slots to minutes (each slot = 15 minutes)
                await UserCredits.useCredit(studentId, event.id, durationMinutes, transaction);
            }

            // If using in-person payment, create a transaction record with outstanding status
            if (paymentMethod === 'in-person') {
                const { Transactions } = require('./Transactions');
                await Transactions.recordTransaction(
                    studentId,
                    transactionAmount,
                    'in-person',
                    'outstanding', // Status is outstanding until payment is collected
                    null, // No payment intent ID for in-person
                    null, // No Stripe customer ID for in-person
                    null, // No plan ID for single lessons
                    transaction // Pass the transaction to ensure atomicity
                );
            }

            await transaction.commit();

            // Send booking confirmation email after successful booking
            // We do this after all booking operations are complete to ensure consistency
            try {
                // Get the complete booking data with relationships for the email
                const bookingWithDetails = await this.getEventById(event.id);
                
                if (bookingWithDetails) {
                    const emailJobId = await emailQueueService.queueBookingConfirmation(
                        bookingWithDetails,
                        paymentMethod
                    );
                }
            } catch (emailError) {
                // Log email error but don't fail the booking
                // The booking is already complete and successful
                console.error('Email queue error during booking confirmation:', emailError);
            }
        } catch (error) {
            await transaction.rollback();
            throw error;
        }

        return event;
    } catch (error) {
        console.error('Error in addEvent:', error);
        throw error;
    }
};

Calendar.getInstructorEvents = async function(instructorId) {
    // Import Attendance and Refund models here to avoid circular dependency
    const { Attendance } = require('./Attendance');
    const { Refund } = require('./Refund');
    
    const events = await this.findAll({
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
            },
            {
                model: Attendance,
                required: false, // LEFT JOIN - include events without attendance records
                attributes: ['status', 'notes', 'created_at', 'updated_at']
            },
            {
                model: Refund,
                required: false, // LEFT JOIN - include events without refund records
                attributes: ['type', 'amount', 'created_at', 'refunded_by']
            }
        ],
        order: [['date', 'ASC'], ['start_slot', 'ASC']]
    });

    // Normalize to flat structure with nested student object and attendance data
    return events.map(event => {
        const eventData = event.toJSON();
        return {
            ...eventData,
            // Normalize student data to nested structure
            student: eventData.student ? {
                id: eventData.student_id,
                name: eventData.student.name,
                email: eventData.student.email
            } : null,
            // Normalize instructor data
            instructor_name: eventData.Instructor?.User?.name || null,
            // Include attendance data
            attendance: eventData.Attendance ? {
                status: eventData.Attendance.status,
                notes: eventData.Attendance.notes,
                recorded_at: eventData.Attendance.updated_at
            } : null,
            // Include refund status
            refundStatus: eventData.Refunds && eventData.Refunds.length > 0 ? {
                status: 'refunded',
                type: eventData.Refunds[0].type,
                amount: eventData.Refunds[0].amount,
                refunded_at: eventData.Refunds[0].created_at
            } : { status: 'none' }
        };
    });
};

Calendar.updateEvent = async function(eventId, updates, transaction = null) {
    const event = await this.findByPk(eventId, { transaction });
    if (!event) {
        throw new Error('Event not found');
    }
    await event.update(updates, { transaction });
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
    const { Refund } = require('./Refund');
    
    return this.findAll({
        where: {
            student_id: studentId,
            date: {
                [sequelize.Op.gte]: currentDateUTC
            },
            status: { [sequelize.Op.ne]: 'cancelled' }
        },
        include: [
            {
                model: Instructor,
                include: [{
                    model: User,
                    attributes: ['name']
                }]
            },
            {
                model: Refund,
                required: false, // LEFT JOIN - include events without refunds
                attributes: ['type', 'amount', 'created_at', 'refunded_by']
            }
        ],
        order: [['date', 'ASC'], ['start_slot', 'ASC']]
    });
};

Calendar.getAllStudentEvents = async function(studentId) {
    const { Refund } = require('./Refund');
    
    return this.findAll({
        where: {
            student_id: studentId
        },
        include: [
            {
                model: Instructor,
                include: [{
                    model: User,
                    attributes: ['name']
                }]
            },
            {
                model: Refund,
                required: false, // LEFT JOIN - include events without refunds
                attributes: ['type', 'amount', 'created_at', 'refunded_by']
            }
        ],
        order: [['date', 'DESC'], ['start_slot', 'ASC']]
    });
};

Calendar.getEventById = async function(eventId) {
    // Import Attendance model here to avoid circular dependency
    const { Attendance } = require('./Attendance');
    
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
                    attributes: ['id', 'name', 'email']
                }]
            },
            {
                model: Attendance,
                required: false, // LEFT JOIN - include events without attendance records
                attributes: ['status', 'notes', 'created_at', 'updated_at']
            }
        ]
    });
};

module.exports = { Calendar }; 