'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('subscription_events', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            subscription_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'subscriptions',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            event_type: {
                type: Sequelize.STRING,
                allowNull: false
            },
            event_data: {
                type: Sequelize.JSON,
                allowNull: false
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Add index on subscription_id for faster lookups
        await queryInterface.addIndex('subscription_events', ['subscription_id']);
        
        // Add index on event_type for filtering
        await queryInterface.addIndex('subscription_events', ['event_type']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('subscription_events');
    }
};
