const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');
const { Credits } = require('./Credits');
const { Transactions } = require('./Transactions');

const PaymentPlan = sequelize.define('PaymentPlan', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    credits: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'one-time'
    },
    duration_days: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    stripe_price_id: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'payment_plans',
    timestamps: false
});

// Static methods
PaymentPlan.getAll = async function() {
    return this.findAll({
        order: [['price', 'ASC']]
    });
};

PaymentPlan.getById = async function(id) {
    return this.findByPk(id);
};

PaymentPlan.purchase = async function(userId, planId, paymentMethod) {
    const transaction = await sequelize.transaction();

    try {
        // Get the plan
        const plan = await this.findByPk(planId);
        if (!plan) {
            throw new Error('Plan not found');
        }

        // Calculate expiry date if it's a membership
        const expiryDate = plan.type === 'membership' 
            ? new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000)
            : null;

        // Record the transaction
        await Transactions.recordTransaction(userId, plan.price, paymentMethod, 'completed', null, null, planId);

        // Only add credits for one-time plans (lesson packages), not memberships
        if (plan.type === 'one-time') {
            await Credits.addCredits(userId, plan.credits, expiryDate);
        }

        await transaction.commit();
        return { success: true };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

module.exports = { PaymentPlan };
