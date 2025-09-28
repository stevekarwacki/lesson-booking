const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');
const { 
    validateUserId, 
    validateCredits, 
    validateEventId, 
    validateDuration, 
    validateExpiryDate 
} = require('../utils/creditValidation');

const UserCredits = sequelize.define('UserCredits', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    credits_remaining: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30
    }
}, {
    tableName: 'user_credits',
    timestamps: false
});

const CreditUsage = sequelize.define('CreditUsage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    calendar_event_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'calendar_events',
            key: 'id'
        }
    },
    duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'credit_usage',
    timestamps: false
});

// Static methods for UserCredits model
UserCredits.getUserCredits = async function(userId) {
    // Validate parameters
    const validUserId = validateUserId(userId);
    
    const result = await this.findOne({
        where: {
            user_id: validUserId,
            [sequelize.Op.or]: [
                { expiry_date: null },
                { expiry_date: { [sequelize.Op.gte]: new Date() } }
            ]
        },
        attributes: [
            [sequelize.fn('SUM', sequelize.col('credits_remaining')), 'total_credits'],
            [sequelize.fn('MIN', sequelize.col('expiry_date')), 'next_expiry']
        ],
        raw: true
    });

    return {
        total_credits: result?.total_credits || 0,
        next_expiry: result?.next_expiry || null
    };
};

UserCredits.getUserCreditsBreakdown = async function(userId) {
    // Validate parameters
    const validUserId = validateUserId(userId);
    
    const results = await this.findAll({
        where: {
            user_id: validUserId,
            credits_remaining: { [sequelize.Op.gt]: 0 },
            [sequelize.Op.or]: [
                { expiry_date: null },
                { expiry_date: { [sequelize.Op.gte]: new Date() } }
            ]
        },
        attributes: [
            'duration_minutes',
            [sequelize.fn('SUM', sequelize.col('credits_remaining')), 'total_credits'],
            [sequelize.fn('MIN', sequelize.col('expiry_date')), 'next_expiry']
        ],
        group: ['duration_minutes'],
        raw: true
    });

    // Convert to a more usable format
    const breakdown = {
        30: { credits: 0, next_expiry: null },
        60: { credits: 0, next_expiry: null }
    };

    results.forEach(result => {
        const duration = result.duration_minutes;
        if (breakdown[duration]) {
            breakdown[duration].credits = result.total_credits || 0;
            breakdown[duration].next_expiry = result.next_expiry;
        }
    });

    return breakdown;
};

UserCredits.addCredits = async function(userId, credits, expiryDate = null, durationMinutes = null) {
    try {
        // Validate parameters
        const validUserId = validateUserId(userId);
        const validCredits = validateCredits(credits);
        const validExpiryDate = validateExpiryDate(expiryDate);
        
        // Get default duration from settings if not provided
        if (durationMinutes === null) {
            const { AppSettings } = require('./AppSettings');
            durationMinutes = await AppSettings.getDefaultLessonDuration();
        }
        
        // Validate duration (after potentially getting from settings)
        const validDuration = validateDuration(durationMinutes);
        // Try to update existing non-expired record with matching duration
        const [updated] = await this.update(
            { credits_remaining: sequelize.literal(`credits_remaining + ${validCredits}`) },
            {
                where: {
                    user_id: validUserId,
                    duration_minutes: validDuration,
                    [sequelize.Op.or]: [
                        { expiry_date: null },
                        { expiry_date: { [sequelize.Op.gte]: new Date() } }
                    ]
                }
            }
        );

        // If no record was updated, create a new one
        if (updated === 0) {
            const newCredit = await this.create({
                user_id: validUserId,
                credits_remaining: validCredits,
                expiry_date: validExpiryDate,
                duration_minutes: validDuration
            });
            return newCredit.id;
        }

        return updated;
    } catch (error) {
        throw error;
    }
};

UserCredits.useCredit = async function(userId, eventId, durationMinutes = null) {
    // Validate parameters
    const validUserId = validateUserId(userId);
    const validEventId = validateEventId(eventId);
    
    // Get default duration from settings if not provided
    if (durationMinutes === null) {
        const { AppSettings } = require('./AppSettings');
        durationMinutes = await AppSettings.getDefaultLessonDuration();
    }
    
    // Validate duration (after potentially getting from settings)
    const validDuration = validateDuration(durationMinutes);
    const transaction = await sequelize.transaction();

    try {
        // Update credits for specific duration
        const [updated] = await this.update(
            { credits_remaining: sequelize.literal('credits_remaining - 1') },
            {
                where: {
                    user_id: validUserId,
                    duration_minutes: validDuration,
                    credits_remaining: { [sequelize.Op.gt]: 0 },
                    [sequelize.Op.or]: [
                        { expiry_date: null },
                        { expiry_date: { [sequelize.Op.gte]: new Date() } }
                    ]
                },
                transaction
            }
        );

        if (updated === 0) {
            throw new Error('INSUFFICIENT_CREDITS');
        }

        // Record credit usage with duration
        await CreditUsage.create({
            user_id: validUserId,
            calendar_event_id: validEventId,
            duration_minutes: validDuration
        }, { transaction });

        await transaction.commit();
        
        // Check credits after successful deduction for real-time monitoring
        try {
            const { checkUserCreditsStatus } = require('../utils/creditNotifications');
            await checkUserCreditsStatus(validUserId);
        } catch (emailError) {
            // Don't fail the credit usage if email fails
        }
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

UserCredits.hasSufficientCredits = async function(userId, durationMinutes = null) {
    // Validate parameters
    const validUserId = validateUserId(userId);
    
    // Get default duration from settings if not provided
    if (durationMinutes === null) {
        const { AppSettings } = require('./AppSettings');
        durationMinutes = await AppSettings.getDefaultLessonDuration();
    }
    
    // Validate duration (after potentially getting from settings)
    const validDuration = validateDuration(durationMinutes);
    const result = await this.findOne({
        where: {
            user_id: validUserId,
            duration_minutes: validDuration,
            credits_remaining: { [sequelize.Op.gt]: 0 },
            [sequelize.Op.or]: [
                { expiry_date: null },
                { expiry_date: { [sequelize.Op.gte]: new Date() } }
            ]
        },
        attributes: [
            [sequelize.fn('SUM', sequelize.col('credits_remaining')), 'total_credits']
        ],
        raw: true
    });
    
    return (result?.total_credits || 0) > 0;
};

module.exports = { UserCredits, CreditUsage };
