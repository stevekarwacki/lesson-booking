const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');
const { Subscription } = require('./Subscription');

const SubscriptionEvent = sequelize.define('SubscriptionEvent', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    subscription_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'subscriptions',
            key: 'id'
        }
    },
    event_type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    event_data: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, {
    tableName: 'subscription_events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// Associations
SubscriptionEvent.belongsTo(Subscription, { foreignKey: 'subscription_id' });

// Static methods
SubscriptionEvent.recordEvent = async function(subscriptionId, eventType, eventData) {
    return this.create({
        subscription_id: subscriptionId,
        event_type: eventType,
        event_data: eventData
    });
};

module.exports = { SubscriptionEvent }; 