const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');
const { validateTransactionData } = require('../utils/paymentValidation');

const Transactions = sequelize.define('Transactions', {
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
        allowNull: true,
        references: {
            model: 'payment_plans',
            key: 'id'
        }
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    payment_method: {
        type: DataTypes.ENUM('stripe', 'credits', 'in-person'),
        allowNull: false,
        validate: {
            isIn: [['stripe', 'credits', 'in-person']]
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed', 'outstanding'),
        allowNull: false,
        defaultValue: 'completed',
        validate: {
            isIn: [['pending', 'completed', 'failed', 'outstanding']]
        }
    },
    payment_intent_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    stripe_customer_id: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// Static methods
Transactions.recordTransaction = async function(userId, amount, paymentMethod, status = 'completed', paymentIntentId = null, stripeCustomerId = null, planId = null, transaction = null) {
    // Validate transaction data before creating
    const transactionData = validateTransactionData({
        user_id: userId,
        amount,
        payment_method: paymentMethod,
        status
    });

    const createOptions = {
        user_id: transactionData.user_id,
        payment_plan_id: planId,
        amount: transactionData.amount,
        payment_method: transactionData.payment_method,
        status: transactionData.status,
        payment_intent_id: paymentIntentId,
        stripe_customer_id: stripeCustomerId
    };

    // If a transaction is provided, use it for atomicity
    if (transaction) {
        return this.create(createOptions, { transaction });
    } else {
        return this.create(createOptions);
    }
};

Transactions.getTransactions = async function(userId) {
    return this.findAll({
        where: { user_id: userId },
        include: [{
            model: sequelize.models.PaymentPlan,
            attributes: ['name']
        }],
        order: [['created_at', 'DESC']]
    });
};

module.exports = { Transactions }; 