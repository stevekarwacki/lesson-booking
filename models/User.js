const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');
const cache = require('../db/cache');
const { stripe } = require('../config/stripe');

const CACHE_KEYS = {
    allUsers: 'users:all',
    userById: (id) => `users:${id}`
};

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'student',
        validate: {
            isIn: [['student', 'instructor', 'admin']]
        }
    },
    is_approved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    stripe_customer_id: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// Static methods
const clearCache = async (userId = null) => {
    try {
        await cache.del(CACHE_KEYS.allUsers);
        if (userId) {
            await cache.del(CACHE_KEYS.userById(userId));
        }
    } catch (err) {
        console.error('Cache clear error:', err);
    }
};

// Instance methods
User.findByEmail = async function(email) {
    return this.findOne({ where: { email } });
};

User.getUserName = async function(userId) {
    const user = await this.findByPk(userId, {
        attributes: ['name']
    });
    return user ? user.name : null;
};

User.getAllUsers = async function() {
    return this.findAll({
        attributes: { exclude: ['password'] }
    });
};

User.findById = async function(id) {
    return this.findByPk(id, {
        attributes: { exclude: ['password'] }
    });
};

User.updateUser = async function(id, updates) {
    const user = await this.findByPk(id);
    if (!user) {
        throw new Error('User not found');
    }
    await user.update(updates);
    await clearCache(id);
    return user;
};

User.deleteUser = async function(id) {
    const user = await this.findByPk(id);
    if (!user) {
        throw new Error('User not found');
    }
    await user.destroy();
    await clearCache(id);
};

User.updateUserRole = async function(userId, role) {
    const user = await this.findByPk(userId);
    if (!user) {
        throw new Error('User not found');
    }
    await user.update({ role });
    await clearCache(userId);
    return user;
};

User.setApprovalStatus = async function(userId, isApproved) {
    const user = await this.findByPk(userId);
    if (!user) {
        throw new Error('User not found');
    }
    await user.update({ is_approved: isApproved });
    await clearCache(userId);
    return user;
};

// Add a method to get plain object representation
User.getPlainObject = function(user) {
    if (!user) return null;
    return user.get({ plain: true });
};

// Add a method to update subscription periods
User.updateSubscriptionPeriods = async function(userId) {
    try {
        const { Subscription } = require('./Subscription');
        // Get user's active subscription
        const subscription = await Subscription.findActiveByUserId(userId);

        if (subscription) {
            // Check if current period is in the past
            const now = new Date();
            if (subscription.current_period_end > now) {
                return { success: true, updated: false };
            }

            // Retrieve subscription from Stripe to get latest period dates
            const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);

            // Convert Unix timestamps to Date objects
            const periodStart = new Date(stripeSubscription.billing_cycle_anchor * 1000);
            
            // Calculate period end based on plan interval
            const periodEnd = new Date(periodStart);
            const intervalCount = stripeSubscription.plan.interval_count || 1;
            
            switch (stripeSubscription.plan.interval) {
                case 'day':
                    periodEnd.setDate(periodEnd.getDate() + intervalCount);
                    break;
                case 'week':
                    periodEnd.setDate(periodEnd.getDate() + (7 * intervalCount));
                    break;
                case 'month':
                    periodEnd.setMonth(periodEnd.getMonth() + intervalCount);
                    break;
                case 'year':
                    periodEnd.setFullYear(periodEnd.getFullYear() + intervalCount);
                    break;
            }
            
            // Update subscription with new period dates
            const updatedSubscription = await subscription.update({
                current_period_start: periodStart,
                current_period_end: periodEnd
            });

            return { success: true, updated: true };
        }

        return { success: true, updated: false };
    } catch (error) {
        console.error('Error updating subscription periods:', error);
        throw error;
    }
};

// Function to set up associations
const setupAssociations = (models) => {
    User.hasMany(models.Subscription, { foreignKey: 'user_id' });
};

// Hooks
User.afterCreate(async (user) => {
    await clearCache();
});

User.afterUpdate(async (user) => {
    await clearCache(user.id);
});

User.afterDestroy(async (user) => {
    await clearCache(user.id);
});

module.exports = { User, clearCache, setupAssociations }; 