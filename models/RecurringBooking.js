const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');
const cache = require('../db/cache');

const CACHE_KEYS = {
    allRecurringBookings: 'recurring_bookings:all',
    recurringBookingById: (id) => `recurring_bookings:${id}`,
    recurringBookingsByUserId: (userId) => `recurring_bookings:user:${userId}`,
    recurringBookingsBySubscriptionId: (subscriptionId) => `recurring_bookings:subscription:${subscriptionId}`,
    recurringBookingsByInstructor: (instructorId) => `recurring_bookings:instructor:${instructorId}`
};

const RecurringBooking = sequelize.define('RecurringBooking', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    subscription_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'subscriptions',
            key: 'id'
        }
    },
    instructor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'instructors',
            key: 'id'
        }
    },
    day_of_week: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 0,
            max: 6
        }
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
    }
}, {
    tableName: 'recurring_bookings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['subscription_id']
        },
        {
            fields: ['instructor_id', 'day_of_week']
        }
    ]
});

// Cache management
const clearCache = async (recurringBookingId = null, subscriptionId = null, instructorId = null) => {
    try {
        await cache.del(CACHE_KEYS.allRecurringBookings);
        if (recurringBookingId) {
            await cache.del(CACHE_KEYS.recurringBookingById(recurringBookingId));
        }
        if (subscriptionId) {
            await cache.del(CACHE_KEYS.recurringBookingsBySubscriptionId(subscriptionId));
        }
        if (instructorId) {
            await cache.del(CACHE_KEYS.recurringBookingsByInstructor(instructorId));
        }
    } catch (err) {
        console.error('Cache clear error:', err);
    }
};

// Static methods
RecurringBooking.checkCalendarConflicts = async function(instructorId, dayOfWeek, startSlot, duration) {
    const { Calendar } = require('./Calendar');
    const { Op } = require('sequelize');
    
    // Get database dialect-specific day of week extraction
    const dialect = sequelize.getDialect();
    let dayOfWeekExpression;
    
    if (dialect === 'sqlite') {
        // SQLite uses strftime
        dayOfWeekExpression = `CAST(strftime('%w', date) AS INTEGER)`;
    } else if (dialect === 'postgres') {
        // PostgreSQL uses EXTRACT
        dayOfWeekExpression = `EXTRACT(DOW FROM date)`;
    } else {
        // Default to PostgreSQL syntax for other databases (MySQL also supports EXTRACT)
        dayOfWeekExpression = `EXTRACT(DOW FROM date)`;
    }
    
    const conflictingEvents = await Calendar.findAll({
        where: {
            instructor_id: instructorId,
            // Check if any existing events on the same day of week conflict
            [Op.and]: [
                sequelize.literal(`${dayOfWeekExpression} = ${dayOfWeek}`),
                {
                    // Check for time slot overlap
                    [Op.or]: [
                        // Case 1: Existing event starts within our recurring slot
                        {
                            start_slot: {
                                [Op.gte]: startSlot,
                                [Op.lt]: startSlot + duration
                            }
                        },
                        // Case 2: Our recurring slot starts within existing event
                        {
                            [Op.and]: [
                                { start_slot: { [Op.lte]: startSlot } },
                                sequelize.literal(`start_slot + duration > ${startSlot}`)
                            ]
                        }
                    ]
                }
            ]
        },
        include: [{
            model: sequelize.models.User,
            as: 'student',
            attributes: ['name', 'email']
        }]
    });
    
    if (conflictingEvents.length > 0) {
        const conflictDetails = conflictingEvents.map(event => {
            const hours24 = Math.floor(event.start_slot/4);
            const minutes = (event.start_slot%4)*15;
            const hours12 = hours24 % 12 || 12; // Convert to 12-hour format
            const period = hours24 >= 12 ? 'PM' : 'AM';
            const timeStr = `${hours12}:${String(minutes).padStart(2,'0')} ${period}`;
            return `${event.date} at ${timeStr}`;
        }).join(', ');
        throw new Error(`Time slot conflicts with existing bookings on: ${conflictDetails}`);
    }
};

RecurringBooking.findBySubscriptionId = async function(subscriptionId) {
    const cacheKey = CACHE_KEYS.recurringBookingsBySubscriptionId(subscriptionId);
    try {
        const cached = await cache.get(cacheKey);
        if (cached) {
            return cached;
        }
    } catch (err) {
        console.error('Cache get error:', err);
    }

    const recurringBooking = await this.findOne({
        where: { subscription_id: subscriptionId },
        include: [
            {
                model: sequelize.models.Subscription,
                include: [{ model: sequelize.models.User }]
            },
            {
                model: sequelize.models.Instructor,
                include: [{ model: sequelize.models.User }]
            }
        ]
    });

    if (recurringBooking) {
        try {
            await cache.set(cacheKey, recurringBooking, 3600); // Cache for 1 hour
        } catch (err) {
            console.error('Cache set error:', err);
        }
    }

    return recurringBooking;
};

RecurringBooking.findByInstructorAndDay = async function(instructorId, dayOfWeek) {
    return this.findAll({
        where: {
            instructor_id: instructorId,
            day_of_week: dayOfWeek
        },
        include: [
            {
                model: sequelize.models.Subscription,
                where: { status: 'active' },
                include: [{ model: sequelize.models.User }]
            },
            {
                model: sequelize.models.Instructor,
                include: [{ model: sequelize.models.User }]
            }
        ]
    });
};

RecurringBooking.createForSubscription = async function(subscriptionId, bookingData) {
    // Check if subscription is eligible for recurring bookings
    const { Subscription } = require('./Subscription');
    const eligibility = await Subscription.checkRecurringEligibility(subscriptionId);
    if (!eligibility.eligible) {
        throw new Error(eligibility.reason);
    }
    
    // Check if subscription already has a recurring booking
    const hasExistingBooking = await Subscription.hasActiveRecurringBooking(subscriptionId);
    if (hasExistingBooking) {
        throw new Error('Subscription already has a recurring booking');
    }
    
    // Validate instructor availability
    const { getWeeklyAvailability } = require('./InstructorAvailability');
    const availability = await getWeeklyAvailability(bookingData.instructor_id);
    
    const isTimeAvailable = availability.some(slot => {
        if (slot.day_of_week !== bookingData.day_of_week) return false;
        const slotEnd = slot.start_slot + slot.duration;
        return bookingData.start_slot >= slot.start_slot && 
               bookingData.start_slot < slotEnd && 
               (bookingData.start_slot + bookingData.duration) <= slotEnd;
    });
    
    if (!isTimeAvailable) {
        throw new Error('Selected time is outside instructor availability');
    }
    
    // Check for conflicts with existing calendar events
    await this.checkCalendarConflicts(
        bookingData.instructor_id,
        bookingData.day_of_week,
        bookingData.start_slot,
        bookingData.duration
    );
    
    // Create the recurring booking
    const recurringBooking = await this.create({
        subscription_id: subscriptionId,
        instructor_id: bookingData.instructor_id,
        day_of_week: bookingData.day_of_week,
        start_slot: bookingData.start_slot,
        duration: bookingData.duration
    });
    
    await clearCache(null, subscriptionId, bookingData.instructor_id);
    
    return recurringBooking;
};

RecurringBooking.updateRecurringBooking = async function(id, updates) {
    const recurringBooking = await this.findByPk(id);
    if (!recurringBooking) {
        throw new Error('Recurring booking not found');
    }
    
    // If updating time/day, validate instructor availability
    if (updates.day_of_week !== undefined || updates.start_slot !== undefined || updates.duration !== undefined) {
        const { getWeeklyAvailability } = require('./InstructorAvailability');
        const availability = await getWeeklyAvailability(
            updates.instructor_id || recurringBooking.instructor_id
        );
        
        const dayOfWeek = updates.day_of_week !== undefined ? updates.day_of_week : recurringBooking.day_of_week;
        const startSlot = updates.start_slot !== undefined ? updates.start_slot : recurringBooking.start_slot;
        const duration = updates.duration !== undefined ? updates.duration : recurringBooking.duration;
        
        const isTimeAvailable = availability.some(slot => {
            if (slot.day_of_week !== dayOfWeek) return false;
            const slotEnd = slot.start_slot + slot.duration;
            return startSlot >= slot.start_slot && 
                   startSlot < slotEnd && 
                   (startSlot + duration) <= slotEnd;
        });
        
        if (!isTimeAvailable) {
            throw new Error('Selected time is outside instructor availability');
        }
        
        // Check for conflicts with existing calendar events
        await this.checkCalendarConflicts(
            updates.instructor_id || recurringBooking.instructor_id,
            dayOfWeek,
            startSlot,
            duration
        );
    }
    
    await recurringBooking.update(updates);
    await clearCache(id, recurringBooking.subscription_id, recurringBooking.instructor_id);
    
    return recurringBooking;
};

RecurringBooking.deleteBySubscriptionId = async function(subscriptionId) {
    const recurringBooking = await this.findBySubscriptionId(subscriptionId);
    if (recurringBooking) {
        await recurringBooking.destroy();
        await clearCache(recurringBooking.id, subscriptionId, recurringBooking.instructor_id);
    }
};

// Function to set up associations
const setupAssociations = (models) => {
    RecurringBooking.belongsTo(models.Subscription, { foreignKey: 'subscription_id' });
    RecurringBooking.belongsTo(models.Instructor, { foreignKey: 'instructor_id' });
    
    // Set up reverse associations
    models.Subscription.hasOne(RecurringBooking, { foreignKey: 'subscription_id' });
    models.Instructor.hasMany(RecurringBooking, { foreignKey: 'instructor_id' });
};

// Hooks
RecurringBooking.afterCreate(async (recurringBooking) => {
    await clearCache(null, recurringBooking.subscription_id, recurringBooking.instructor_id);
});

RecurringBooking.afterUpdate(async (recurringBooking) => {
    await clearCache(recurringBooking.id, recurringBooking.subscription_id, recurringBooking.instructor_id);
});

RecurringBooking.afterDestroy(async (recurringBooking) => {
    await clearCache(recurringBooking.id, recurringBooking.subscription_id, recurringBooking.instructor_id);
});

module.exports = { RecurringBooking, setupAssociations }; 