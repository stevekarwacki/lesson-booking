const { sequelize } = require('../db/index');
const { InstructorAvailability } = require('./InstructorAvailability');
const { User } = require('./User');
const { Instructor } = require('./Instructor');
const { PaymentPlan } = require('./PaymentPlan');
const { Transactions } = require('./Transactions');

// Define associations
User.hasOne(Instructor, { foreignKey: 'user_id' });
Instructor.belongsTo(User, { foreignKey: 'user_id' });

Instructor.hasMany(InstructorAvailability, { foreignKey: 'instructor_id' });
InstructorAvailability.belongsTo(Instructor, { foreignKey: 'instructor_id' });

// Payment and transaction associations
User.hasMany(Transactions, { foreignKey: 'user_id' });
Transactions.belongsTo(User, { foreignKey: 'user_id' });

PaymentPlan.hasMany(Transactions, { foreignKey: 'payment_plan_id' });
Transactions.belongsTo(PaymentPlan, { foreignKey: 'payment_plan_id' });

// Initialize all models
const initModels = async () => {
    try {
        await sequelize.sync();
        console.log('All models were synchronized successfully.');
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
    PaymentPlan,
    Transactions
}; 