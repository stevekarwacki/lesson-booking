const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');
const cache = require('../db/cache');

const CACHE_KEYS = {
    allSubscriptions: 'subscriptions:all',
    subscriptionById: (id) => `subscriptions:${id}`,
    subscriptionsByUserId: (userId) => `subscriptions:user:${userId}`
};

const Subscription = sequelize.define('Subscription', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    payment_plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    stripe_subscription_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'incomplete'
    },
    current_period_start: {
        type: DataTypes.DATE,
        allowNull: true
    },
    current_period_end: {
        type: DataTypes.DATE,
        allowNull: true
    },
    cancel_at_period_end: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Static methods
const clearCache = async (subscriptionId = null, userId = null) => {
    try {
        await cache.del(CACHE_KEYS.allSubscriptions);
        if (subscriptionId) {
            await cache.del(CACHE_KEYS.subscriptionById(subscriptionId));
        }
        if (userId) {
            await cache.del(CACHE_KEYS.subscriptionsByUserId(userId));
        }
    } catch (err) {
        console.error('Cache clear error:', err);
    }
};

// Instance methods
Subscription.findByStripeId = async function(stripeId) {
    return this.findOne({ where: { stripe_subscription_id: stripeId } });
};

Subscription.findByUserId = async function(userId) {
    return this.findAll({ where: { user_id: userId } });
};

Subscription.findActiveByUserId = async function(userId) {
    return this.findOne({
        where: {
            user_id: userId,
            status: 'active',
            cancel_at_period_end: false
        }
    });
};

Subscription.createSubscription = async function(userId, planId, stripeSubscriptionId, periodStart, periodEnd) {
    const subscription = await this.create({
        user_id: userId,
        payment_plan_id: planId,
        stripe_subscription_id: stripeSubscriptionId,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        status: 'active'
    });
    await clearCache(null, subscription.user_id);
    return subscription;
};

Subscription.updateSubscription = async function(id, updates) {
    const subscription = await this.findByPk(id);
    if (!subscription) {
        throw new Error('Subscription not found');
    }
    await subscription.update(updates);
    await clearCache(id, subscription.user_id);
    return subscription;
};

Subscription.deleteSubscription = async function(id) {
    const subscription = await this.findByPk(id);
    if (!subscription) {
        throw new Error('Subscription not found');
    }
    await subscription.destroy();
    await clearCache(id, subscription.user_id);
};

// Check if subscription has an active recurring booking
Subscription.hasActiveRecurringBooking = async function(subscriptionId) {
    const { RecurringBooking } = require('./RecurringBooking');
    const recurringBooking = await RecurringBooking.findBySubscriptionId(subscriptionId);
    return !!recurringBooking;
};

// Get the recurring booking for a subscription
Subscription.getRecurringBooking = async function(subscriptionId) {
    const { RecurringBooking } = require('./RecurringBooking');
    return await RecurringBooking.findBySubscriptionId(subscriptionId);
};

// Check if subscription is eligible for recurring bookings
Subscription.checkRecurringEligibility = async function(subscriptionId) {
    const subscription = await this.findByPk(subscriptionId);
    if (!subscription) {
        return { eligible: false, reason: 'Subscription not found' };
    }
    
    // Must be active
    if (subscription.status !== 'active') {
        return { eligible: false, reason: 'Subscription is not active' };
    }
    
    // Must not be set to cancel at period end
    if (subscription.cancel_at_period_end) {
        return { eligible: false, reason: 'Subscription is set to cancel' };
    }
    
    // Must be a membership plan
    const { PaymentPlan } = require('./PaymentPlan');
    const plan = await PaymentPlan.findByPk(subscription.payment_plan_id);
    if (!plan || plan.type !== 'membership') {
        return { eligible: false, reason: 'Only membership subscriptions can have recurring bookings' };
    }
    
    return { eligible: true };
};

// Add a method to get plain object representation
Subscription.getPlainObject = function(subscription) {
    if (!subscription) return null;
    return subscription.get({ plain: true });
};

// Calculate prorated credits for subscription cancellation
Subscription.calculateProratedCredits = async function(subscriptionId) {
    const subscription = await this.findByPk(subscriptionId);
    if (!subscription) {
        throw new Error('Subscription not found');
    }

    // Get the payment plan to understand pricing and credits
    const { PaymentPlan } = require('./PaymentPlan');
    const plan = await PaymentPlan.findByPk(subscription.payment_plan_id);
    if (!plan) {
        throw new Error('Payment plan not found');
    }

    // Only membership plans are eligible for prorated credits
    if (plan.type !== 'membership') {
        return {
            eligible: false,
            reason: 'Only membership subscriptions are eligible for prorated credits',
            credits: 0
        };
    }

    // TEMPORARILY DISABLED FOR DEBUGGING - 30-day minimum validation
    // TODO: Re-enable this validation before production deployment
    /*
    // Check 30-day minimum requirement
    const subscriptionStartDate = new Date(subscription.created_at);
    const thirtyDaysLater = new Date(subscriptionStartDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    const now = new Date();

    if (now < thirtyDaysLater) {
        const remainingDays = Math.ceil((thirtyDaysLater - now) / (24 * 60 * 60 * 1000));
        return {
            eligible: false,
            reason: `Subscription must be active for at least 30 days before cancellation. ${remainingDays} days remaining.`,
            credits: 0
        };
    }
    */

    // Get current subscription state from Stripe for accurate information
    const { stripe } = require('../config/stripe');
    let stripeSubscription;
    try {
        stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    } catch (error) {
        console.error('Error retrieving subscription from Stripe:', error);
        throw new Error('Failed to retrieve subscription details from Stripe');
    }

    // Check if subscription is already cancelled in Stripe
    if (stripeSubscription.status === 'canceled') {
        return {
            eligible: false,
            reason: 'Your subscription has already been cancelled',
            credits: 0,
            alreadyCancelled: true,
            cancelledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null
        };
    }

    const now = new Date();
    let periodEnd, periodStart, effectiveEndTime;

    // For active subscriptions, use current period dates
    periodStart = new Date(subscription.current_period_start);
    periodEnd = new Date(subscription.current_period_end);
    effectiveEndTime = now;
    
    // Check if current billing period has ended for active subscriptions
    if (effectiveEndTime >= periodEnd) {
        return {
            eligible: false,
            reason: 'Current billing period has already ended',
            credits: 0
        };
    }

    // Calculate remaining billing period details
    const totalBillingDays = Math.ceil((periodEnd - periodStart) / (24 * 60 * 60 * 1000));
    const remainingBillingDays = Math.ceil((periodEnd - effectiveEndTime) / (24 * 60 * 60 * 1000));
    
    // Ensure we don't have negative remaining days
    const actualRemainingDays = Math.max(0, remainingBillingDays);
    const unusedPercentage = Math.round((actualRemainingDays / totalBillingDays) * 100) / 100;
    const monetaryValueUnused = Math.round((parseFloat(plan.price) * unusedPercentage) * 100) / 100;

    // Calculate lesson credit compensation
    // Membership business model: 1 monthly membership = 4 weekly lessons
    // Credit compensation: 1 credit per unused weekly lesson opportunity
    const weeklyLessonsPerMonth = 4;
    const unusedWeeklyLessons = Math.ceil(actualRemainingDays / 7);
    const creditCompensation = Math.min(unusedWeeklyLessons, weeklyLessonsPerMonth);

    return {
        eligible: true,
        reason: 'Subscription eligible for prorated credit compensation',
        credits: creditCompensation,
        calculation: {
            billingPeriod: {
                totalDays: totalBillingDays,
                remainingDays: actualRemainingDays,
                unusedPercentage: unusedPercentage
            },
            monetaryValue: {
                unusedAmount: monetaryValueUnused
            },
            lessonCredits: {
                weeklyLessonsPerMonth,
                unusedWeeklyLessons,
                creditCompensation,
                reasoning: 'One credit per unused weekly lesson opportunity'
            }
        }
    };
};

// Function to set up associations
const setupAssociations = (models) => {
    Subscription.belongsTo(models.User, { foreignKey: 'user_id' });
    Subscription.belongsTo(models.PaymentPlan, { foreignKey: 'payment_plan_id' });
};

// Hooks
Subscription.afterCreate(async (subscription) => {
    await clearCache(null, subscription.user_id);
});

Subscription.afterUpdate(async (subscription) => {
    await clearCache(subscription.id, subscription.user_id);
});

Subscription.afterDestroy(async (subscription) => {
    await clearCache(subscription.id, subscription.user_id);
});

module.exports = { Subscription, clearCache, setupAssociations }; 