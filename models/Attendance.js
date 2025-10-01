const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');

const Attendance = sequelize.define('Attendance', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    calendar_event_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'calendar_events',
            key: 'id'
        },
        unique: true // Ensure one attendance record per event
    },
    status: {
        type: DataTypes.ENUM('present', 'absent', 'tardy'),
        allowNull: true,
        defaultValue: null,
        validate: {
            isIn: [['present', 'absent', 'tardy']]
        }
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'attendance',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Static methods for attendance management
Attendance.markAttendance = async function(calendarEventId, status, notes = null) {
    try {
        // Validate status
        if (status && !['present', 'absent', 'tardy'].includes(status)) {
            throw new Error('Invalid attendance status. Must be present, absent, or tardy.');
        }

        // Use upsert to create or update attendance record
        const [attendance, created] = await this.upsert({
            calendar_event_id: calendarEventId,
            status: status,
            notes: notes
        }, {
            returning: true
        });

        return {
            attendance,
            created // true if new record, false if updated
        };
    } catch (error) {
        throw new Error(`Failed to mark attendance: ${error.message}`);
    }
};

Attendance.getAttendanceByEventId = async function(calendarEventId) {
    try {
        return await this.findOne({
            where: { calendar_event_id: calendarEventId }
        });
    } catch (error) {
        throw new Error(`Failed to get attendance: ${error.message}`);
    }
};

Attendance.getAttendanceByEventIds = async function(calendarEventIds) {
    try {
        return await this.findAll({
            where: { 
                calendar_event_id: calendarEventIds 
            }
        });
    } catch (error) {
        throw new Error(`Failed to get attendance records: ${error.message}`);
    }
};

module.exports = { Attendance };
