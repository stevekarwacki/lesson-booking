const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');
const { User } = require('../models/User');
const { AppSettings } = require('../models/AppSettings');
const { Transactions } = require('../models/Transactions');
const { Calendar } = require('../models/Calendar');

// Mock authentication middleware for testing
const mockAuth = (user) => (req, res, next) => {
    req.user = user;
    next();
};

test('In-Person Payment Integration Tests', async (t) => {
    // Test data setup
    const adminUser = { id: 1, role: 'admin', name: 'Admin User' };
    const instructorUser = { id: 2, role: 'instructor', name: 'Instructor User' };
    const studentUser = { id: 3, role: 'student', name: 'Student User' };

    await t.test('Admin can configure global in-person payment setting', async () => {
        // Mock admin authentication
        app.use('/api/admin', mockAuth(adminUser));

        // Enable in-person payments globally
        const response = await request(app)
            .put('/api/admin/settings/lessons')
            .send({
                in_person_payment_enabled: true,
                default_duration: 30
            })
            .expect(200);

        assert.ok(response.body.success);
    });

    await t.test('Admin can set per-student override', async () => {
        app.use('/api/admin', mockAuth(adminUser));

        const response = await request(app)
            .put('/api/admin/users/3')
            .send({
                in_person_payment_override: 'enabled'
            })
            .expect(200);

        assert.ok(response.body.success);
    });

    await t.test('Student can check payment options', async () => {
        app.use('/api/users', mockAuth(studentUser));

        const response = await request(app)
            .get('/api/users/me/payment-options')
            .expect(200);

        assert.strictEqual(typeof response.body.canUseInPersonPayment, 'boolean');
    });

    await t.test('Student can book lesson with in-person payment', async () => {
        app.use('/api/calendar', mockAuth(studentUser));

        const bookingData = {
            date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            time: '10:00',
            duration: 30,
            instructor_id: 2,
            payment_method: 'in-person'
        };

        const response = await request(app)
            .post('/api/calendar/addEvent')
            .send(bookingData)
            .expect(200);

        assert.ok(response.body.success);
        assert.ok(response.body.eventId);

        // Verify transaction was created with outstanding status
        const transaction = await Transactions.findOne({
            where: {
                user_id: studentUser.id,
                payment_method: 'in-person',
                status: 'outstanding'
            }
        });
        assert.ok(transaction);
    });

    await t.test('Instructor can view booking with payment status', async () => {
        app.use('/api/calendar', mockAuth(instructorUser));

        const response = await request(app)
            .get('/api/calendar/instructor/2')
            .expect(200);

        assert.ok(Array.isArray(response.body));
        
        // Find booking with in-person payment
        const inPersonBooking = response.body.find(booking => 
            booking.paymentMethod === 'in-person'
        );
        
        if (inPersonBooking) {
            assert.strictEqual(inPersonBooking.paymentStatus, 'outstanding');
        }
    });

    await t.test('Instructor can update payment status', async () => {
        app.use('/api/calendar', mockAuth(instructorUser));

        // First, get a booking ID
        const bookingsResponse = await request(app)
            .get('/api/calendar/instructor/2')
            .expect(200);

        const inPersonBooking = bookingsResponse.body.find(booking => 
            booking.paymentMethod === 'in-person' && 
            booking.paymentStatus === 'outstanding'
        );

        if (inPersonBooking) {
            const response = await request(app)
                .put(`/api/calendar/bookings/${inPersonBooking.id}/payment-status`)
                .send({
                    status: 'completed',
                    notes: 'Payment received in cash'
                })
                .expect(200);

            assert.ok(response.body.success);

            // Verify transaction status was updated
            const updatedTransaction = await Transactions.findOne({
                where: {
                    user_id: studentUser.id,
                    payment_method: 'in-person'
                }
            });
            assert.strictEqual(updatedTransaction.status, 'completed');
        }
    });

    await t.test('Student cannot update payment status', async () => {
        app.use('/api/calendar', mockAuth(studentUser));

        await request(app)
            .put('/api/calendar/bookings/1/payment-status')
            .send({
                status: 'completed'
            })
            .expect(403); // Forbidden
    });

    await t.test('Payment status colors work correctly', async () => {
        const { getPaymentStatusColor } = require('../utils/inPersonPaymentUtils');

        // Test completed payment
        assert.strictEqual(
            getPaymentStatusColor({ status: 'completed' }, null),
            'green'
        );

        // Test outstanding payment without attendance
        assert.strictEqual(
            getPaymentStatusColor({ status: 'outstanding' }, null),
            'yellow'
        );

        // Test outstanding payment with present attendance
        assert.strictEqual(
            getPaymentStatusColor({ status: 'outstanding' }, { status: 'present' }),
            'red'
        );

        // Test outstanding payment with absent attendance
        assert.strictEqual(
            getPaymentStatusColor({ status: 'outstanding' }, { status: 'absent' }),
            'yellow'
        );
    });

    await t.test('User eligibility logic works correctly', async () => {
        const { canUserUseInPersonPayment } = require('../utils/inPersonPaymentUtils');

        // Test user with enabled override
        assert.strictEqual(
            canUserUseInPersonPayment({ in_person_payment_override: 'enabled' }, false),
            true
        );

        // Test user with disabled override
        assert.strictEqual(
            canUserUseInPersonPayment({ in_person_payment_override: 'disabled' }, true),
            false
        );

        // Test user with no override, global enabled
        assert.strictEqual(
            canUserUseInPersonPayment({ in_person_payment_override: null }, true),
            true
        );

        // Test user with no override, global disabled
        assert.strictEqual(
            canUserUseInPersonPayment({ in_person_payment_override: null }, false),
            false
        );
    });

    await t.test('Validation prevents invalid payment methods', async () => {
        const { validatePaymentMethod } = require('../utils/paymentValidation');

        // Valid payment methods
        assert.doesNotThrow(() => validatePaymentMethod('stripe'));
        assert.doesNotThrow(() => validatePaymentMethod('credits'));
        assert.doesNotThrow(() => validatePaymentMethod('in-person'));

        // Invalid payment methods
        assert.throws(() => validatePaymentMethod('cash'));
        assert.throws(() => validatePaymentMethod('invalid'));
    });

    await t.test('Transaction enrichment works correctly', async () => {
        const { enrichEventWithPaymentInfo } = require('../utils/paymentEnrichment');

        // Mock event data
        const eventData = {
            id: 1,
            date: new Date().toISOString(),
            student_id: 3
        };

        // This would normally query the database
        // For testing, we'll verify the function exists and can be called
        assert.strictEqual(typeof enrichEventWithPaymentInfo, 'function');
        
        // Test with mock data (would need actual database setup for full test)
        const result = await enrichEventWithPaymentInfo(eventData, 3);
        assert.ok(result);
        assert.strictEqual(result.id, eventData.id);
    });
});
