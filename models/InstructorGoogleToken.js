const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');

const InstructorGoogleToken = sequelize.define('InstructorGoogleToken', {
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
        unique: true // One token record per instructor
    },
    access_token: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    refresh_token: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    token_expiry: {
        type: DataTypes.DATE,
        allowNull: true
    },
    scope: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'https://www.googleapis.com/auth/calendar.readonly'
    }
}, {
    tableName: 'instructor_google_tokens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['instructor_id']
        }
    ]
});

// Static methods for testing
InstructorGoogleToken.createOrUpdate = async function(instructorId, tokenData) {
    const [token, created] = await this.upsert({
        instructor_id: instructorId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expiry: tokenData.expiry_date ? new Date(tokenData.expiry_date) : null,
        scope: tokenData.scope
    });
    
    return { token, created };
};

InstructorGoogleToken.findByInstructorId = async function(instructorId) {
    return this.findOne({
        where: { instructor_id: instructorId }
    });
};

InstructorGoogleToken.removeByInstructorId = async function(instructorId) {
    return this.destroy({
        where: { instructor_id: instructorId }
    });
};

// Instance methods
InstructorGoogleToken.prototype.isExpired = function() {
    if (!this.token_expiry) return false;
    return new Date() >= this.token_expiry;
};

InstructorGoogleToken.prototype.updateTokens = async function(tokenData) {
    await this.update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || this.refresh_token,
        token_expiry: tokenData.expiry_date ? new Date(tokenData.expiry_date) : null
    });
    return this;
};

module.exports = { InstructorGoogleToken }; 