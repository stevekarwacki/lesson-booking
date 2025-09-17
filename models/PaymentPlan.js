const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');
const { Credits } = require('./Credits');
const { Transactions } = require('./Transactions');
const emailQueueService = require('../services/EmailQueueService');

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

PaymentPlan.purchase = async function(userId, planId, paymentMethod, paymentIntentId = null) {
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
        const transactionRecord = await Transactions.recordTransaction(
            userId, 
            plan.price, 
            paymentMethod, 
            'completed', 
            paymentIntentId, 
            null, 
            planId
        );

        // Only add credits for one-time plans (lesson packages), not memberships
        if (plan.type === 'one-time') {
            await Credits.addCredits(userId, plan.credits, expiryDate);
        }

        await transaction.commit();

        // Queue purchase confirmation email after successful transaction
        // Using queue ensures email doesn't block payment response and includes retry logic
        // Email failure cannot affect the purchase success since transaction is already committed
        try {
            const emailJobId = await emailQueueService.queuePurchaseConfirmation(
                userId,
                {
                    name: plan.name,
                    credits: plan.credits,
                    type: plan.type
                },
                {
                    amount: plan.price,
                    payment_method: paymentMethod,
                    payment_intent_id: paymentIntentId
                }
            );
            
            console.log(`Purchase confirmation email queued for user ${userId}, plan ${planId} (Job ID: ${emailJobId})`);
        } catch (emailError) {
            // Log email queue error but don't fail the purchase
            // This is extremely unlikely to fail since queueing is synchronous
            console.error('Email queue error during purchase confirmation:', emailError);
        }

        return { success: true, transactionId: transactionRecord.id };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

module.exports = { PaymentPlan };
