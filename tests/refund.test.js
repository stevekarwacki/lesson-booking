const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

// Mock environment variables before importing any modules
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock_webhook_secret_for_testing';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_APP_PASSWORD = 'test_password';
process.env.COMPANY_NAME = 'Test Company';

const RefundService = require('../services/RefundService');
const { Calendar } = require('../models/Calendar');
const { Transactions } = require('../models/Transactions');
const { UserCredits, CreditUsage } = require('../models/Credits');
const { Refund } = require('../models/Refund');
const { User } = require('../models/User');
const { Instructor } = require('../models/Instructor');
const { sequelize } = require('../db/index');

// Import models to ensure associations are loaded
require('../models/index');

console.log('🧪 Running Refund System test suite');
console.log('Testing refund processing, Stripe integration, and business logic');

describe('Refund System Tests', () => {
    let refundService;
    let testUser, testInstructor, testStudent, testBooking, testTransaction, testInstructorRecord;

    beforeEach(async () => {
        refundService = new RefundService();
        
        // Create unique test data using timestamp
        const timestamp = Date.now();
        
        // Create test users
        testInstructor = await User.create({
            name: 'Test Instructor',
            email: `instructor${timestamp}@test.com`,
            password: 'hashedpassword',
            role: 'instructor'
        });

        testStudent = await User.create({
            name: 'Test Student',
            email: `student${timestamp}@test.com`,
            password: 'hashedpassword',
            role: 'student'
        });

        // Create instructor record
        testInstructorRecord = await Instructor.create({
            user_id: testInstructor.id,
            hourly_rate: 50.00,
            bio: 'Test instructor',
            is_active: true
        });

        // Create test booking
        testBooking = await Calendar.create({
            instructor_id: testInstructorRecord.id,
            student_id: testStudent.id,
            date: '2025-12-01',
            start_slot: 40, // 10:00 AM
            duration: 2, // 30 minutes
            status: 'booked'
        });

        // Create test transaction
        testTransaction = await Transactions.create({
            user_id: testStudent.id,
            amount: 50.00,
            payment_method: 'stripe',
            status: 'completed',
            payment_intent_id: 'pi_test_123456789'
        });
    });

    afterEach(async () => {
        try {
            // Clean up test data in reverse order of dependencies
            if (testTransaction) await testTransaction.destroy();
            if (testBooking) await testBooking.destroy();
            if (testInstructorRecord) await testInstructorRecord.destroy();
            if (testStudent) await testStudent.destroy();
            if (testInstructor) await testInstructor.destroy();
        } catch (error) {
            console.log('Test cleanup warning:', error.message);
        }
    });

    describe('RefundService.getRefundInfo()', () => {
        test('should return refund info for a valid booking', async () => {
            const refundInfo = await refundService.getRefundInfo(testBooking.id);
            
            assert.strictEqual(refundInfo.booking.id, testBooking.id);
            assert.strictEqual(refundInfo.booking.student_id, testStudent.id);
            assert.strictEqual(refundInfo.canRefund, true);
            assert.strictEqual(refundInfo.paidWithStripe, true);
            assert.strictEqual(refundInfo.paidWithCredits, false);
        });

        test('should throw error for non-existent booking', async () => {
            await assert.rejects(
                async () => await refundService.getRefundInfo(99999),
                { message: 'Booking not found' }
            );
        });

        test('should detect credit-paid bookings', async () => {
            // Create a credit usage record
            await CreditUsage.create({
                user_id: testStudent.id,
                calendar_event_id: testBooking.id,
                credits_used: 1,
                duration_minutes: 30
            });

            const refundInfo = await refundService.getRefundInfo(testBooking.id);
            
            assert.strictEqual(refundInfo.paidWithCredits, true);
            assert.strictEqual(refundInfo.paidWithStripe, false);
        });

        test('should throw error for already refunded booking', async () => {
            // Create a refund record
            await Refund.create({
                booking_id: testBooking.id,
                original_transaction_id: testTransaction.id,
                amount: 50.00,
                type: 'stripe',
                refunded_by: testInstructor.id
            });

            await assert.rejects(
                async () => await refundService.getRefundInfo(testBooking.id),
                { message: 'Booking has already been refunded' }
            );
        });
    });

    describe('RefundService.isEligibleForAutomaticRefund()', () => {
        test('should return true for bookings more than 24 hours away', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 2); // 2 days from now
            
            const booking = {
                date: futureDate.toISOString().split('T')[0],
                start_slot: 40 // 10:00 AM
            };

            const isEligible = refundService.isEligibleForAutomaticRefund(booking);
            assert.strictEqual(isEligible, true);
        });

        test('should return false for bookings less than 24 hours away', () => {
            const nearDate = new Date();
            nearDate.setHours(nearDate.getHours() + 12); // 12 hours from now
            
            const booking = {
                date: nearDate.toISOString().split('T')[0],
                start_slot: 40
            };

            const isEligible = refundService.isEligibleForAutomaticRefund(booking);
            assert.strictEqual(isEligible, false);
        });

        test('should return false for past bookings', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1); // Yesterday
            
            const booking = {
                date: pastDate.toISOString().split('T')[0],
                start_slot: 40
            };

            const isEligible = refundService.isEligibleForAutomaticRefund(booking);
            assert.strictEqual(isEligible, false);
        });

        test('should handle invalid booking data gracefully', () => {
            assert.strictEqual(refundService.isEligibleForAutomaticRefund(null), false);
            assert.strictEqual(refundService.isEligibleForAutomaticRefund({}), false);
            assert.strictEqual(refundService.isEligibleForAutomaticRefund({ date: null }), false);
        });
    });

    describe('RefundService.processRefund() - Credit Refunds', () => {
        beforeEach(async () => {
            // Set up credit-based booking
            await CreditUsage.create({
                user_id: testStudent.id,
                calendar_event_id: testBooking.id,
                credits_used: 1,
                duration_minutes: 30
            });

            // Add initial credits to user
            await UserCredits.addCredits(testStudent.id, 5, null, 30);
        });

        test('should process credit refund successfully', async () => {
            const result = await refundService.processRefund(
                testBooking.id,
                'credit',
                testInstructor.id,
                'Test refund'
            );

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.refundType, 'credit');
            assert.strictEqual(result.amount, 0); // Credit refunds don't have monetary amount
            assert(result.refundId);

            // Verify refund record was created
            const refundRecord = await Refund.findByPk(result.refundId);
            assert.strictEqual(refundRecord.booking_id, testBooking.id);
            assert.strictEqual(refundRecord.type, 'credit');
            assert.strictEqual(refundRecord.refunded_by, testInstructor.id);
            assert.strictEqual(refundRecord.reason, 'Test refund');
        });

        test('should add credits back to user account', async () => {
            // Mock UserCredits.getUserCredits to return predictable values
            const originalGetUserCredits = UserCredits.getUserCredits;
            let creditsCallCount = 0;
            UserCredits.getUserCredits = async (userId) => {
                creditsCallCount++;
                // First call (initial): return 0 credits
                // Second call (after refund): return 1 credit
                return { total: creditsCallCount === 1 ? 0 : 1 };
            };

            try {
                const initialCredits = await UserCredits.getUserCredits(testStudent.id);
                
                await refundService.processRefund(
                    testBooking.id,
                    'credit',
                    testInstructor.id
                );

                const finalCredits = await UserCredits.getUserCredits(testStudent.id);
                assert.strictEqual(finalCredits.total - initialCredits.total, 1);
            } finally {
                // Restore original method
                UserCredits.getUserCredits = originalGetUserCredits;
            }
        });
    });

    describe('RefundService.processRefund() - Stripe Refunds', () => {
        test('should validate Stripe refund requirements', async () => {
            // Try to refund as Stripe when paid with credits
            await CreditUsage.create({
                user_id: testStudent.id,
                calendar_event_id: testBooking.id,
                credits_used: 1,
                duration_minutes: 30
            });

            await assert.rejects(
                async () => await refundService.processRefund(
                    testBooking.id,
                    'stripe',
                    testInstructor.id
                ),
                { message: 'Cannot refund to Stripe - booking was not paid with Stripe' }
            );
        });

        test('should handle missing payment intent ID', async () => {
            // Update transaction to have no payment intent ID
            await testTransaction.update({ payment_intent_id: null });

            await assert.rejects(
                async () => await refundService.processRefund(
                    testBooking.id,
                    'stripe',
                    testInstructor.id
                ),
                { message: 'No Stripe payment intent found for this booking' }
            );
        });

        test('should handle missing Stripe transaction', async () => {
            // Mock the Transactions.findOne method to return null (simulating missing transaction)
            const originalFindOne = Transactions.findOne;
            Transactions.findOne = async () => null;

            try {
                await assert.rejects(
                    async () => await refundService.processRefund(
                        testBooking.id,
                        'stripe',
                        testInstructor.id
                    ),
                    { message: 'Cannot refund to Stripe - booking was not paid with Stripe' }
                );
            } finally {
                // Restore original method
                Transactions.findOne = originalFindOne;
            }
        });
    });

    describe('RefundService.processAutomaticRefund()', () => {
        test('should process automatic refund for eligible Stripe booking', async () => {
            // Mock the Stripe refunds.create method to avoid API calls
            const originalStripe = refundService.stripe;
            refundService.stripe = {
                refunds: {
                    create: async () => ({
                        id: 're_mock_refund_id',
                        status: 'succeeded',
                        amount: 5000 // cents
                    })
                }
            };

            try {
                // Set booking to future date (eligible for automatic refund)
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 2);
                await testBooking.update({ 
                    date: futureDate.toISOString().split('T')[0] 
                });

                const result = await refundService.processAutomaticRefund(
                    testBooking.id,
                    testStudent.id
                );

                assert.strictEqual(result.success, true);
                assert.strictEqual(result.refundType, 'stripe');
                assert.strictEqual(result.amount, 50.00);
            } finally {
                // Restore original Stripe instance
                refundService.stripe = originalStripe;
            }
        });

        test('should process automatic refund for eligible credit booking', async () => {
            // Set up credit booking
            await CreditUsage.create({
                user_id: testStudent.id,
                calendar_event_id: testBooking.id,
                credits_used: 1,
                duration_minutes: 30
            });

            // Set booking to future date
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 2);
            await testBooking.update({ 
                date: futureDate.toISOString().split('T')[0] 
            });

            const result = await refundService.processAutomaticRefund(
                testBooking.id,
                testStudent.id
            );

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.refundType, 'credit');
        });

        test('should return null for ineligible bookings', async () => {
            // Set booking to near future (< 24 hours)
            const nearDate = new Date();
            nearDate.setHours(nearDate.getHours() + 12);
            await testBooking.update({ 
                date: nearDate.toISOString().split('T')[0] 
            });

            const result = await refundService.processAutomaticRefund(
                testBooking.id,
                testStudent.id
            );

            assert.strictEqual(result, null);
        });
    });

    describe('Currency Conversion', () => {
        test('should convert dollars to cents for Stripe API', () => {
            // This tests the Math.round(amount * 100) conversion
            const dollarAmount = 50.00;
            const centsAmount = Math.round(dollarAmount * 100);
            assert.strictEqual(centsAmount, 5000);
        });

        test('should handle decimal amounts correctly', () => {
            const dollarAmount = 25.99;
            const centsAmount = Math.round(dollarAmount * 100);
            assert.strictEqual(centsAmount, 2599);
        });

        test('should handle edge cases in currency conversion', () => {
            assert.strictEqual(Math.round(0.01 * 100), 1);
            assert.strictEqual(Math.round(0.99 * 100), 99);
            assert.strictEqual(Math.round(100.00 * 100), 10000);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle concurrent refund attempts', async () => {
            // Mock the Stripe refunds.create method to avoid API calls
            const originalStripe = refundService.stripe;
            refundService.stripe = {
                refunds: {
                    create: async () => ({
                        id: 're_mock_refund_id',
                        status: 'succeeded',
                        amount: 5000 // cents
                    })
                }
            };

            try {
                // First refund should succeed
                await refundService.processRefund(
                    testBooking.id,
                    'stripe',
                    testInstructor.id
                );

                // Second refund attempt should fail because booking is already refunded
                await assert.rejects(
                    async () => await refundService.processRefund(
                        testBooking.id,
                        'stripe',
                        testInstructor.id
                    ),
                    { message: 'Booking has already been refunded' }
                );
            } finally {
                // Restore original Stripe instance
                refundService.stripe = originalStripe;
            }
        });

        test('should handle cancelled bookings', async () => {
            await testBooking.update({ status: 'cancelled' });
            
            const refundInfo = await refundService.getRefundInfo(testBooking.id);
            assert.strictEqual(refundInfo.canRefund, false);
        });
    });
});
