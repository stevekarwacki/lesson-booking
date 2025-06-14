const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');
const cache = require('../db/cache');

const CACHE_KEYS = {
    allPlans: 'plans:all',
    planById: (id) => `plans:${id}`
};

const Plan = sequelize.define('Plan', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    interval: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [['day', 'week', 'month', 'year']]
        }
    },
    stripe_price_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Static methods
const clearCache = async (planId = null) => {
    try {
        await cache.del(CACHE_KEYS.allPlans);
        if (planId) {
            await cache.del(CACHE_KEYS.planById(planId));
        }
    } catch (err) {
        console.error('Cache clear error:', err);
    }
};

// Instance methods
Plan.findByStripePriceId = async function(stripePriceId) {
    return this.findOne({ where: { stripe_price_id: stripePriceId } });
};

Plan.getActivePlans = async function() {
    return this.findAll({ where: { is_active: true } });
};

Plan.createPlan = async function(planData) {
    const plan = await this.create(planData);
    await clearCache();
    return plan;
};

Plan.updatePlan = async function(id, updates) {
    const plan = await this.findByPk(id);
    if (!plan) {
        throw new Error('Plan not found');
    }
    await plan.update(updates);
    await clearCache(id);
    return plan;
};

Plan.deletePlan = async function(id) {
    const plan = await this.findByPk(id);
    if (!plan) {
        throw new Error('Plan not found');
    }
    await plan.destroy();
    await clearCache(id);
};

// Add a method to get plain object representation
Plan.getPlainObject = function(plan) {
    if (!plan) return null;
    return plan.get({ plain: true });
};

// Hooks
Plan.afterCreate(async (plan) => {
    await clearCache();
});

Plan.afterUpdate(async (plan) => {
    await clearCache(plan.id);
});

Plan.afterDestroy(async (plan) => {
    await clearCache(plan.id);
});

module.exports = { Plan, clearCache }; 