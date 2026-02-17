const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');

const InstructorCalendarConfig = sequelize.define('InstructorCalendarConfig', {
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
        },
        unique: true // One calendar config per instructor
    },
    calendar_id: {
        type: DataTypes.STRING,
        allowNull: true, // Now optional - OAuth uses 'primary' calendar
        comment: 'Google Calendar ID (for service account) or null (for OAuth primary calendar)'
    },
    calendar_name: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Display name for the calendar'
    },
    calendar_type: {
        type: DataTypes.ENUM('personal', 'shared'),
        defaultValue: 'personal',
        comment: 'Type of calendar (personal email or shared calendar)'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this calendar integration is active'
    },
    last_tested_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last time the calendar connection was tested'
    },
    last_test_status: {
        type: DataTypes.ENUM('success', 'failed', 'never_tested'),
        defaultValue: 'never_tested',
        comment: 'Status of the last connection test'
    },
    all_day_event_handling: {
        type: DataTypes.ENUM('ignore', 'block'),
        defaultValue: 'ignore',
        comment: 'How to handle all-day events: ignore them or block the entire day'
    }
}, {
    tableName: 'instructor_calendar_configs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['instructor_id']
        },
        {
            fields: ['calendar_id']
        }
    ]
});

// Static methods for managing calendar configurations
InstructorCalendarConfig.createOrUpdate = async function(instructorId, configData) {
    // First try to find existing config (including inactive ones)
    let config = await this.findOne({
        where: { instructor_id: instructorId }
    });
    
    const configValues = {
        calendar_id: configData.calendar_id,
        calendar_name: configData.calendar_name || null,
        calendar_type: configData.calendar_type || 'personal',
        is_active: configData.is_active !== undefined ? configData.is_active : true
    };

    if (configData.all_day_event_handling) {
        configValues.all_day_event_handling = configData.all_day_event_handling;
    }
    
    let created = false;
    
    if (config) {
        // Update existing config
        await config.update(configValues);
    } else {
        // Create new config
        config = await this.create({
            instructor_id: instructorId,
            ...configValues
        });
        created = true;
    }
    
    return { config, created };
};

InstructorCalendarConfig.findByInstructorId = async function(instructorId) {
    return this.findOne({
        where: { 
            instructor_id: instructorId,
            is_active: true 
        }
    });
};

InstructorCalendarConfig.removeByInstructorId = async function(instructorId) {
    return this.destroy({
        where: { instructor_id: instructorId }
    });
};

InstructorCalendarConfig.findActiveConfigs = async function() {
    return this.findAll({
        where: { is_active: true },
        include: [{
            model: sequelize.models.Instructor,
            attributes: ['id', 'name', 'email']
        }]
    });
};

// Instance methods
InstructorCalendarConfig.prototype.updateTestStatus = async function(status, error = null) {
    await this.update({
        last_tested_at: new Date(),
        last_test_status: status
    });
    return this;
};

InstructorCalendarConfig.prototype.deactivate = async function() {
    await this.update({ is_active: false });
    return this;
};

InstructorCalendarConfig.prototype.activate = async function() {
    await this.update({ is_active: true });
    return this;
};

module.exports = { InstructorCalendarConfig }; 