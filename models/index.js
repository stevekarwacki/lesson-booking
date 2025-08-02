const { sequelize } = require('../db/index');
const { InstructorAvailability } = require('./InstructorAvailability');
const { User, setupAssociations: setupUserAssociations } = require('./User');
const { Instructor } = require('./Instructor');
const { InstructorGoogleToken } = require('./InstructorGoogleToken');
const { InstructorCalendarConfig } = require('./InstructorCalendarConfig');
const { PaymentPlan } = require('./PaymentPlan');
const { Transactions } = require('./Transactions');
const { Subscription, setupAssociations: setupSubscriptionAssociations } = require('./Subscription');
const { RecurringBooking, setupAssociations: setupRecurringBookingAssociations } = require('./RecurringBooking');
const runSeeds = require('../seeds');

// Define associations
User.hasOne(Instructor, { foreignKey: 'user_id' });
Instructor.belongsTo(User, { foreignKey: 'user_id' });

Instructor.hasMany(InstructorAvailability, { foreignKey: 'instructor_id' });
InstructorAvailability.belongsTo(Instructor, { foreignKey: 'instructor_id' });

// Google Calendar associations (keeping both during migration)
Instructor.hasOne(InstructorGoogleToken, { foreignKey: 'instructor_id' });
InstructorGoogleToken.belongsTo(Instructor, { foreignKey: 'instructor_id' });

// New calendar config associations
Instructor.hasOne(InstructorCalendarConfig, { foreignKey: 'instructor_id' });
InstructorCalendarConfig.belongsTo(Instructor, { foreignKey: 'instructor_id' });

// Payment and transaction associations
User.hasMany(Transactions, { foreignKey: 'user_id' });
Transactions.belongsTo(User, { foreignKey: 'user_id' });

PaymentPlan.hasMany(Transactions, { foreignKey: 'payment_plan_id' });
Transactions.belongsTo(PaymentPlan, { foreignKey: 'payment_plan_id' });

// Set up model associations
const models = {
    User,
    Subscription,
    PaymentPlan,
    Instructor,
    InstructorAvailability,
    InstructorGoogleToken,
    InstructorCalendarConfig,
    Transactions,
    RecurringBooking
};

setupUserAssociations(models);
setupSubscriptionAssociations(models);
setupRecurringBookingAssociations(models);

// Initialize all models
const initModels = async () => {
    try {
        await sequelize.sync();
        console.log('All models were synchronized successfully.');
        
        // Run seeds after sync
        if (process.env.RUN_SEEDS === 'true') {
            await runSeeds(models);
        }
    } catch (error) {
        console.error('Error synchronizing models:', error);
    }
};

module.exports = {
    sequelize,
    initModels,
    User,
    Instructor,
    InstructorAvailability,
    InstructorGoogleToken,
    InstructorCalendarConfig,
    PaymentPlan,
    Transactions,
    Subscription,
    RecurringBooking
}; 