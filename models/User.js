const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');
const cache = require('../db/cache');

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
    },
    in_person_payment_override: {
        type: DataTypes.ENUM('enabled', 'disabled'),
        allowNull: true,
        defaultValue: null,
        validate: {
            isIn: [['enabled', 'disabled']]
        }
    },
    user_profile_data: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'JSON field for address and parent approval data'
    },
    phone_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: null,
        validate: {
            is: {
                args: /^[+]?[\d\s\-()]+$/,
                msg: 'Phone number must contain only digits, spaces, hyphens, parentheses, or start with +'
            }
        }
    },
    is_student_minor: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: null
    },
    profile_completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
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

// Verification helper wrappers - delegates to pure functions in utils/verificationHelpers.js
// This keeps routes DRY by only requiring the User model import
const verificationHelpers = require('../utils/verificationHelpers');

User.isVerificationComplete = function(user) {
    return verificationHelpers.isVerificationComplete(user);
};

User.getVerificationStatus = function(user) {
    return verificationHelpers.getVerificationStatus(user);
};

User.validateVerificationData = function(data) {
    return verificationHelpers.validateVerificationData(data);
};

User.buildProfileData = function(data) {
    return verificationHelpers.buildProfileData(data);
};

// Get plain object representation with verification status included
User.getPlainObject = function(user) {
    if (!user) return null;
    
    const plainUser = user.get({ plain: true });
    const verificationStatus = verificationHelpers.getVerificationStatus(plainUser);
    
    return {
        ...plainUser,
        verification_status: verificationStatus
    };
};

// Add a method to update subscription periods
User.updateSubscriptionPeriods = async function(userId) {
    try {
        const { Subscription } = require('./Subscription');
        // Get user's active subscription
        const subscription = await Subscription.findActiveByUserId(userId);

        if (!subscription) {
            return { success: true, updated: false, message: 'No active subscription found' };
        }

        // Check if current period is in the past
        const now = new Date();
        if (subscription.current_period_end > now) {
            return { success: true, updated: false, message: 'Subscription period is still active' };
        }

        // Check if stripe_subscription_id exists
        if (!subscription.stripe_subscription_id) {
            console.warn(`Subscription ${subscription.id} has no stripe_subscription_id`);
            return { success: true, updated: false, message: 'No Stripe subscription ID' };
        }

        // Retrieve subscription from Stripe to get latest period dates
        const { stripe } = require('../config/stripe');
        
        try {
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
            await subscription.update({
                current_period_start: periodStart,
                current_period_end: periodEnd
            });

            return { success: true, updated: true };
        } catch (stripeError) {
            console.error('Stripe API error in updateSubscriptionPeriods:', stripeError.message);
            return { success: true, updated: false, message: 'Stripe API error', error: stripeError.message };
        }
    } catch (error) {
        console.error('Error updating subscription periods:', error);
        // Return success:false to indicate a real error, but don't crash the endpoint
        return { success: false, error: error.message };
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

// Cascade delete all related records before destroying user
User.beforeDestroy(async (user, options) => {
    const transaction = options.transaction;
    
    // Import models (done here to avoid circular dependencies)
    const { Instructor, Subscription, Transactions, Calendar, Refund } = require('./index');
    const { UserCredits, CreditUsage } = require('./Credits');
    
    // Delete related records in order to respect foreign key constraints
    // Order matters: delete child records before parent records
    
    // 1. Delete credit usage records (references user_credits)
    await CreditUsage.destroy({ where: { user_id: user.id }, transaction });
    
    // 2. Delete user credits
    await UserCredits.destroy({ where: { user_id: user.id }, transaction });
    
    // 3. Delete instructor profile (if exists)
    await Instructor.destroy({ where: { user_id: user.id }, transaction });
    
    // 4. Delete subscriptions (this will cascade to RecurringBookings via subscription_id)
    await Subscription.destroy({ where: { user_id: user.id }, transaction });
    
    // 5. Delete transactions
    await Transactions.destroy({ where: { user_id: user.id }, transaction });
    
    // 6. Delete bookings where user is the student
    await Calendar.destroy({ where: { student_id: user.id }, transaction });
    
    // 7. Preserve refund history by nullifying the refunded_by reference
    // Use validate: false to bypass the allowNull constraint
    await Refund.update(
        { refunded_by: null }, 
        { where: { refunded_by: user.id }, transaction, validate: false }
    );
});

User.afterDestroy(async (user) => {
    await clearCache(user.id);
});

module.exports = { User, clearCache, setupAssociations }; 