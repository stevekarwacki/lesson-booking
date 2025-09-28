const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');

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

// Static methods
const Credits = {
    getUserCredits: async (userId) => {
        const result = await UserCredits.findOne({
            where: {
                user_id: userId,
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
    },

    getUserCreditsBreakdown: async (userId) => {
        const results = await UserCredits.findAll({
            where: {
                user_id: userId,
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
    },

    addCredits: async (userId, credits, expiryDate = null, durationMinutes = 30) => {
        try {
            // Try to update existing non-expired record with matching duration
            const [updated] = await UserCredits.update(
                { credits_remaining: sequelize.literal(`credits_remaining + ${credits}`) },
                {
                    where: {
                        user_id: userId,
                        duration_minutes: durationMinutes,
                        [sequelize.Op.or]: [
                            { expiry_date: null },
                            { expiry_date: { [sequelize.Op.gte]: new Date() } }
                        ]
                    }
                }
            );

            // If no record was updated, create a new one
            if (updated === 0) {
                const newCredit = await UserCredits.create({
                    user_id: userId,
                    credits_remaining: credits,
                    expiry_date: expiryDate,
                    duration_minutes: durationMinutes
                });
                return newCredit.id;
            }

            return updated;
        } catch (error) {
            throw error;
        }
    },

    useCredit: async (userId, eventId, durationMinutes = 30) => {
        const transaction = await sequelize.transaction();

        try {
            // Update credits for specific duration
            const [updated] = await UserCredits.update(
                { credits_remaining: sequelize.literal('credits_remaining - 1') },
                {
                    where: {
                        user_id: userId,
                        duration_minutes: durationMinutes,
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
                user_id: userId,
                calendar_event_id: eventId,
                duration_minutes: durationMinutes
            }, { transaction });

            await transaction.commit();
            
            // Check credits after successful deduction for real-time monitoring
            try {
                await this.checkUserCreditsStatus(userId);
            } catch (emailError) {
                // Don't fail the credit usage if email fails
            }
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    hasSufficientCredits: async (userId, durationMinutes = 30) => {
        const result = await UserCredits.findOne({
            where: {
                user_id: userId,
                duration_minutes: durationMinutes,
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
    },

    checkUserCreditsStatus: async (userId) => {
        const emailQueueService = require('../services/EmailQueueService');
        const { User } = require('./User');
        
        try {
            const credits = await Credits.getUserCredits(userId);
            const user = await User.findByPk(userId);
            
            if (!user) {
                console.error(`User ${userId} not found for credit status check`);
                return;
            }

            const currentCredits = credits.total_credits;
            
            // Get previous credit level from last time we checked
            const cacheKey = `last_credit_check_${userId}`;
            const lastCredits = Credits._creditCheckCache?.get(cacheKey) || null;
            
            // Initialize cache if it doesn't exist
            if (!Credits._creditCheckCache) {
                Credits._creditCheckCache = new Map();
            }
            
            // Store current credit level for next check
            Credits._creditCheckCache.set(cacheKey, currentCredits);
            
            // Only send emails when crossing thresholds downward
            
            // Credits exhausted: send only when going from >0 to 0
            if (currentCredits === 0 && lastCredits !== null && lastCredits > 0) {
                // User credits exhausted notification sent
                
                const completedLessons = await CreditUsage.count({
                    where: { user_id: userId }
                });
                
                await emailQueueService.queueCreditsExhausted(userId, completedLessons);
            }
            // Low balance warning: send only when going from >2 to ≤2 (but not 0)
            else if (currentCredits <= 2 && currentCredits > 0 && lastCredits !== null && lastCredits > 2) {
                // User low balance warning sent
                await emailQueueService.queueLowBalanceWarning(userId, currentCredits);
            }
            // First time checking (lastCredits is null) - only for truly new users
            // In production, this would only happen for users who have never had their credits checked
            // We're being conservative and NOT sending emails on first check to avoid spam
            // No email needed - either credits increased or no threshold crossed
            else {
                // No email notification needed
            }
            
        } catch (error) {
            console.error('Error checking user credit status:', error);
            throw error;
        }
    }
};

module.exports = { Credits, CreditUsage };
