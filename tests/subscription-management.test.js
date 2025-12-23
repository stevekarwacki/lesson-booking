const { describe, it, before, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert');
const { User } = require('../models/User');
const { Subscription } = require('../models/Subscription');
const { PaymentPlan } = require('../models/PaymentPlan');
const { sequelize } = require('../db/index');

// Import models to ensure associations are loaded
require('../models/index');

describe('Subscription Management', () => {
    let testStudent;
    let testInstructor;
    let testPlan;
    let testSubscription;

    before(async () => {
        // Sync database once before all tests
        await sequelize.sync({ force: true });
    });

    after(async () => {
        // Close database connection after all tests
        await sequelize.close();
    });

    beforeEach(async () => {
        // Create unique test data
        const timestamp = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        
        // Create test student
        testStudent = await User.create({
            name: 'Test Student',
            email: `student${timestamp}@test.com`,
            password: '$2b$10$abcdefghijklmnopqrstuv',
            role: 'student',
            is_approved: true
        });

        // Create test instructor
        testInstructor = await User.create({
            name: 'Test Instructor',
            email: `instructor${timestamp}@test.com`,
            password: '$2b$10$abcdefghijklmnopqrstuv',
            role: 'instructor',
            is_approved: true
        });

        // Create test payment plan
        testPlan = await PaymentPlan.create({
            name: 'Test Monthly Plan',
            price: 5000,
            type: 'one-time',
            duration_days: 30,
            credits: 4,
            lesson_duration_minutes: 60
        });
    });

    afterEach(async () => {
        // Cleanup
        if (testSubscription) await testSubscription.destroy().catch(() => {});
        if (testPlan) await testPlan.destroy().catch(() => {});
        if (testStudent) await testStudent.destroy().catch(() => {});
        if (testInstructor) await testInstructor.destroy().catch(() => {});
    });

    describe('Subscription Queries', () => {
        it('should return null for user with no subscription', async () => {
            const subscriptions = await Subscription.findAll({
                where: { user_id: testStudent.id }
            });
            
            assert.strictEqual(subscriptions.length, 0);
        });

        it('should find subscription by user ID', async () => {
            // Create subscription
            testSubscription = await Subscription.create({
                user_id: testStudent.id,
                payment_plan_id: testPlan.id,
                stripe_subscription_id: `sub_test_${Date.now()}`,
                status: 'active',
                current_period_start: new Date(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                cancel_at_period_end: false
            });

            const subscription = await Subscription.findOne({
                where: { user_id: testStudent.id }
            });

            assert.ok(subscription);
            assert.strictEqual(subscription.user_id, testStudent.id);
            assert.strictEqual(subscription.status, 'active');
        });
    });

    describe('Subscription Creation', () => {
        it('should create subscription for student', async () => {
            testSubscription = await Subscription.create({
                user_id: testStudent.id,
                payment_plan_id: testPlan.id,
                stripe_subscription_id: `sub_test_${Date.now()}_1`,
                status: 'active',
                current_period_start: new Date(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                cancel_at_period_end: false
            });

            assert.ok(testSubscription.id);
            assert.strictEqual(testSubscription.user_id, testStudent.id);
            assert.strictEqual(testSubscription.payment_plan_id, testPlan.id);
            assert.strictEqual(testSubscription.status, 'active');
        });

        it('should include payment plan details', async () => {
            testSubscription = await Subscription.create({
                user_id: testStudent.id,
                payment_plan_id: testPlan.id,
                stripe_subscription_id: `sub_test_${Date.now()}_2`,
                status: 'active',
                current_period_start: new Date(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                cancel_at_period_end: false
            });

            const subscription = await Subscription.findByPk(testSubscription.id, {
                include: [{ model: PaymentPlan }]
            });

            assert.ok(subscription.PaymentPlan);
            assert.strictEqual(subscription.PaymentPlan.name, 'Test Monthly Plan');
        });
    });

    describe('Subscription Cancellation', () => {
        beforeEach(async () => {
            testSubscription = await Subscription.create({
                user_id: testStudent.id,
                payment_plan_id: testPlan.id,
                stripe_subscription_id: `sub_test_${Date.now()}_3`,
                status: 'active',
                current_period_start: new Date(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                cancel_at_period_end: false
            });
        });

        it('should mark subscription for cancellation at period end', async () => {
            await testSubscription.update({ cancel_at_period_end: true });
            await testSubscription.reload();

            assert.strictEqual(testSubscription.cancel_at_period_end, true);
            assert.strictEqual(testSubscription.status, 'active'); // Still active until period ends
        });

        it('should immediately cancel subscription', async () => {
            await testSubscription.update({ 
                status: 'cancelled',
                cancel_at_period_end: true 
            });
            await testSubscription.reload();

            assert.strictEqual(testSubscription.status, 'cancelled');
        });
    });

    describe('Subscription Reactivation', () => {
        beforeEach(async () => {
            testSubscription = await Subscription.create({
                user_id: testStudent.id,
                payment_plan_id: testPlan.id,
                stripe_subscription_id: `sub_test_${Date.now()}_4`,
                status: 'active',
                current_period_start: new Date(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                cancel_at_period_end: true // Marked for cancellation
            });
        });

        it('should remove cancellation flag', async () => {
            await testSubscription.update({ cancel_at_period_end: false });
            await testSubscription.reload();

            assert.strictEqual(testSubscription.cancel_at_period_end, false);
            assert.strictEqual(testSubscription.status, 'active');
        });
    });

    describe('Payment Plans', () => {
        it('should query all payment plans', async () => {
            const plans = await PaymentPlan.findAll();

            assert.ok(Array.isArray(plans));
            assert.ok(plans.length > 0);
            
            const plan = plans.find(p => p.id === testPlan.id);
            assert.ok(plan);
            assert.strictEqual(plan.name, 'Test Monthly Plan');
            assert.strictEqual(Number(plan.price), 5000);
        });

        it('should include plan details', async () => {
            const plan = await PaymentPlan.findByPk(testPlan.id);

            assert.ok(plan);
            assert.strictEqual(plan.type, 'one-time');
            assert.strictEqual(plan.duration_days, 30);
            assert.strictEqual(plan.credits, 4);
            assert.strictEqual(plan.lesson_duration_minutes, 60);
        });
    });

    describe('Subscription Data Integrity', () => {
        it('should maintain subscription when user role changes', async () => {
            // Create subscription for student
            testSubscription = await Subscription.create({
                user_id: testStudent.id,
                payment_plan_id: testPlan.id,
                stripe_subscription_id: `sub_test_${Date.now()}_5`,
                status: 'active',
                current_period_start: new Date(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                cancel_at_period_end: false
            });

            // Change user role
            await testStudent.update({ role: 'instructor' });

            // Verify subscription still exists
            const subscription = await Subscription.findByPk(testSubscription.id);
            assert.ok(subscription);
            assert.strictEqual(subscription.user_id, testStudent.id);
        });
    });
});
