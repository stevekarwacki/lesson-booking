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

    addCredits: async (userId, credits, expiryDate = null) => {
        try {
            // Try to update existing non-expired record
            const [updated] = await UserCredits.update(
                { credits_remaining: sequelize.literal(`credits_remaining + ${credits}`) },
                {
                    where: {
                        user_id: userId,
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
                    expiry_date: expiryDate
                });
                return newCredit.id;
            }

            return updated;
        } catch (error) {
            console.error('Error adding credits:', error);
            throw error;
        }
    },

    useCredit: async (userId, eventId) => {
        const transaction = await sequelize.transaction();

        try {
            // Update credits
            const [updated] = await UserCredits.update(
                { credits_remaining: sequelize.literal('credits_remaining - 1') },
                {
                    where: {
                        user_id: userId,
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

            // Record credit usage
            await CreditUsage.create({
                user_id: userId,
                calendar_event_id: eventId
            }, { transaction });

            await transaction.commit();
            
            // Check credits after successful deduction for real-time monitoring
            try {
                await this.checkUserCreditsStatus(userId);
            } catch (emailError) {
                // Don't fail the credit usage if email fails
                console.error('Email notification error after credit usage:', emailError);
            }
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    hasSufficientCredits: async (userId) => {
        const credits = await Credits.getUserCredits(userId);
        return credits.total_credits > 0;
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
                console.log(`User ${user.email} crossed threshold: ${lastCredits} → 0 credits - sending exhausted notification`);
                
                const completedLessons = await CreditUsage.count({
                    where: { user_id: userId }
                });
                
                await emailQueueService.queueCreditsExhausted(userId, completedLessons);
            }
            // Low balance warning: send only when going from >2 to ≤2 (but not 0)
            else if (currentCredits <= 2 && currentCredits > 0 && lastCredits !== null && lastCredits > 2) {
                console.log(`User ${user.email} crossed threshold: ${lastCredits} → ${currentCredits} credits - sending low balance warning`);
                await emailQueueService.queueLowBalanceWarning(userId, currentCredits);
            }
            // First time checking (lastCredits is null) - only for truly new users
            // In production, this would only happen for users who have never had their credits checked
            // We're being conservative and NOT sending emails on first check to avoid spam
            // No email needed - either credits increased or no threshold crossed
            else {
                console.log(`User ${user.email}: ${lastCredits} → ${currentCredits} credits (no email needed)`);
            }
            
        } catch (error) {
            console.error('Error checking user credit status:', error);
            throw error;
        }
    }
};

module.exports = { Credits, CreditUsage };
