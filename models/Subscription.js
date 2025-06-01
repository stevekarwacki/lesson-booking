const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');
const { User } = require('./User');
const { PaymentPlan } = require('./PaymentPlan');

const Subscription = sequelize.define('Subscription', {
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
    payment_plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'payment_plans',
            key: 'id'
        }
    },
    stripe_subscription_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'incomplete'
    },
    current_period_start: {
        type: DataTypes.DATE,
        allowNull: false
    },
    current_period_end: {
        type: DataTypes.DATE,
        allowNull: false
    },
    cancel_at_period_end: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    canceled_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    trial_end: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Associations
Subscription.belongsTo(User, { foreignKey: 'user_id' });
Subscription.belongsTo(PaymentPlan, { foreignKey: 'payment_plan_id' });

// Static methods
Subscription.createSubscription = async function(userId, planId, stripeSubscriptionId, periodStart, periodEnd) {
    return this.create({
        user_id: userId,
        payment_plan_id: planId,
        stripe_subscription_id: stripeSubscriptionId,
        status: 'active',
        current_period_start: periodStart,
        current_period_end: periodEnd
    });
};

Subscription.getActiveSubscription = async function(userId) {
    return this.findOne({
        where: {
            user_id: userId,
            status: 'active',
            cancel_at_period_end: false
        },
        include: [PaymentPlan]
    });
};

module.exports = { Subscription }; 