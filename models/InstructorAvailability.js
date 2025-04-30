const { DataTypes } = require('sequelize');
const sequelize = require('../db/index');

const InstructorAvailability = sequelize.define('InstructorAvailability', {
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
    day_of_week: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    start_slot: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'instructor_weekly_availability',
    timestamps: false
});

// Create the table if it doesn't exist
const createAvailabilityTables = async () => {
    try {
        await InstructorAvailability.sync();
        console.log('Availability table created successfully');
    } catch (error) {
        console.error('Error creating availability table:', error);
        throw error;
    }
};

// Weekly schedule methods
const setWeeklyAvailability = (instructorId, slots) => {
    return new Promise((resolve, reject) => {
        sequelize.transaction(async (t) => {
            try {
                // Delete existing slots
                await InstructorAvailability.destroy({
                    where: {
                        instructor_id: instructorId
                    }
                }, { transaction: t });

                // Insert new slots
                const stmt = await InstructorAvailability.bulkCreate(
                    slots.map(slot => ({
                        instructor_id: instructorId,
                        day_of_week: slot.dayOfWeek,
                        start_slot: slot.startSlot,
                        duration: slot.duration
                    })),
                    { transaction: t }
                );

                resolve(stmt);
            } catch (error) {
                reject(error);
            }
        });
    });
};

const getWeeklyAvailability = (instructorId) => {
    return new Promise((resolve, reject) => {
        InstructorAvailability.findAll({
            where: {
                instructor_id: instructorId
            },
            order: [['day_of_week', 'ASC'], ['start_slot', 'ASC']]
        })
        .then(rows => resolve(rows || []))
        .catch(err => reject(err));
    });
};

// Blocked times methods
const addBlockedTime = (instructorId, blockedTime) => {
    return new Promise((resolve, reject) => {
        sequelize.transaction(async (t) => {
            try {
                const stmt = await Instructor_blocked_times.create({
                    instructor_id: instructorId,
                    start_datetime: blockedTime.startDateTime,
                    end_datetime: blockedTime.endDateTime,
                    reason: blockedTime.reason
                }, { transaction: t });
                resolve(stmt.id);
            } catch (error) {
                reject(error);
            }
        });
    });
};

const removeBlockedTime = (id) => {
    return new Promise((resolve, reject) => {
        sequelize.transaction(async (t) => {
            try {
                await Instructor_blocked_times.destroy({
                    where: {
                        id: id
                    }
                }, { transaction: t });
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
};

module.exports = {
    InstructorAvailability,
    createAvailabilityTables,
    setWeeklyAvailability,
    getWeeklyAvailability,
    addBlockedTime,
    removeBlockedTime
}; 