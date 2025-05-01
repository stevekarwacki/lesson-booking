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
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    hasSufficientCredits: async (userId) => {
        const credits = await Credits.getUserCredits(userId);
        return credits.total_credits > 0;
    }
};

module.exports = { Credits };
