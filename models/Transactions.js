const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');

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
        allowNull: false,
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
        type: DataTypes.ENUM('stripe', 'cash', 'credits'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'completed'
    }
}, {
    tableName: 'transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// Static methods
Transactions.recordTransaction = async function(userId, planId, amount, paymentMethod, status = 'completed') {
    return this.create({
        user_id: userId,
        payment_plan_id: planId,
        amount,
        payment_method: paymentMethod,
        status
    });
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