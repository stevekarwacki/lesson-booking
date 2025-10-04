const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');

const Refund = sequelize.define('Refund', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'calendar_events',
            key: 'id'
        }
    },
    original_transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'transactions',
            key: 'id'
        }
    },
    refund_transaction_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    type: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            isIn: [['stripe', 'credit']]
        }
    },
    refunded_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'refunds',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// Static methods for refund operations
Refund.getRefundForBooking = async function(bookingId) {
    return this.findOne({
        where: { booking_id: bookingId },
        include: [
            {
                model: sequelize.models.User,
                as: 'refundedBy',
                attributes: ['id', 'name']
            }
        ]
    });
};

Refund.hasRefund = async function(bookingId) {
    const refund = await this.findOne({
        where: { booking_id: bookingId },
        attributes: ['id']
    });
    return !!refund;
};

Refund.getRefundStatus = async function(bookingId) {
    const refund = await this.findOne({
        where: { booking_id: bookingId },
        attributes: ['type', 'amount', 'created_at', 'refunded_by']
    });
    
    if (!refund) {
        return { status: 'none' };
    }
    
    return {
        status: refund.type === 'stripe' ? 'refunded_stripe' : 'refunded_credit',
        type: refund.type,
        amount: refund.amount,
        refunded_at: refund.created_at,
        refunded_by: refund.refunded_by
    };
};

module.exports = { Refund };
