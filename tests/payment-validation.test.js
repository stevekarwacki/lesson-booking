const { describe, it } = require('node:test');
const assert = require('node:assert');
const { 
    validatePaymentMethod,
    validateTransactionStatus,
    validateTransactionData,
    isValidPaymentMethod,
    isValidTransactionStatus,
    VALID_PAYMENT_METHODS,
    VALID_TRANSACTION_STATUSES
} = require('../utils/paymentValidation');

describe('Payment Validation', () => {
    describe('Payment Method Validation', () => {
        it('should accept valid payment methods', () => {
            assert.strictEqual(validatePaymentMethod('stripe'), 'stripe');
            assert.strictEqual(validatePaymentMethod('credits'), 'credits');
            assert.strictEqual(validatePaymentMethod('in-person'), 'in-person');
            
            // Should handle case insensitivity and whitespace
            assert.strictEqual(validatePaymentMethod('  STRIPE  '), 'stripe');
            assert.strictEqual(validatePaymentMethod('Credits'), 'credits');
        });

        it('should reject invalid payment methods', () => {
            assert.throws(() => validatePaymentMethod('cash'), /Invalid payment method: cash/);
            assert.throws(() => validatePaymentMethod('invalid'), /Invalid payment method: invalid/);
            assert.throws(() => validatePaymentMethod(''), /Payment method is required/);
            assert.throws(() => validatePaymentMethod(null), /Payment method is required/);
            assert.throws(() => validatePaymentMethod(123), /Payment method is required/);
        });

        it('should check payment method validity', () => {
            assert.strictEqual(isValidPaymentMethod('stripe'), true);
            assert.strictEqual(isValidPaymentMethod('credits'), true);
            assert.strictEqual(isValidPaymentMethod('in-person'), true);
            assert.strictEqual(isValidPaymentMethod('cash'), false);
            assert.strictEqual(isValidPaymentMethod('invalid'), false);
            assert.strictEqual(isValidPaymentMethod(''), false);
        });
    });

    describe('Transaction Status Validation', () => {
        it('should accept valid transaction statuses', () => {
            assert.strictEqual(validateTransactionStatus('pending'), 'pending');
            assert.strictEqual(validateTransactionStatus('completed'), 'completed');
            assert.strictEqual(validateTransactionStatus('failed'), 'failed');
            assert.strictEqual(validateTransactionStatus('outstanding'), 'outstanding');
            
            // Should handle case insensitivity and whitespace
            assert.strictEqual(validateTransactionStatus('  PENDING  '), 'pending');
            assert.strictEqual(validateTransactionStatus('Completed'), 'completed');
        });

        it('should reject invalid transaction statuses', () => {
            assert.throws(() => validateTransactionStatus('invalid'), /Invalid transaction status: invalid/);
            assert.throws(() => validateTransactionStatus(''), /Transaction status is required/);
            assert.throws(() => validateTransactionStatus(null), /Transaction status is required/);
        });

        it('should check transaction status validity', () => {
            assert.strictEqual(isValidTransactionStatus('pending'), true);
            assert.strictEqual(isValidTransactionStatus('completed'), true);
            assert.strictEqual(isValidTransactionStatus('failed'), true);
            assert.strictEqual(isValidTransactionStatus('outstanding'), true);
            assert.strictEqual(isValidTransactionStatus('invalid'), false);
            assert.strictEqual(isValidTransactionStatus(''), false);
        });
    });

    describe('Transaction Data Validation', () => {
        it('should validate complete transaction data', () => {
            const validData = {
                user_id: 1,
                amount: 50.00,
                payment_method: 'stripe',
                status: 'completed'
            };

            const result = validateTransactionData(validData);
            assert.strictEqual(result.user_id, 1);
            assert.strictEqual(result.amount, 50.00);
            assert.strictEqual(result.payment_method, 'stripe');
            assert.strictEqual(result.status, 'completed');
        });

        it('should validate in-person payment data', () => {
            const validData = {
                user_id: 1,
                amount: 50.00,
                payment_method: 'in-person',
                status: 'outstanding'
            };

            const result = validateTransactionData(validData);
            assert.strictEqual(result.payment_method, 'in-person');
            assert.strictEqual(result.status, 'outstanding');
        });

        it('should validate credit transaction data', () => {
            const validData = {
                user_id: 1,
                amount: 0,
                payment_method: 'credits',
                status: 'completed'
            };

            const result = validateTransactionData(validData);
            assert.strictEqual(result.payment_method, 'credits');
            assert.strictEqual(result.amount, 0);
        });

        it('should reject invalid user_id', () => {
            assert.throws(() => validateTransactionData({
                user_id: 0,
                amount: 50,
                payment_method: 'stripe',
                status: 'completed'
            }), /user_id must be a positive integer/);

            assert.throws(() => validateTransactionData({
                user_id: 'invalid',
                amount: 50,
                payment_method: 'stripe',
                status: 'completed'
            }), /user_id must be a positive integer/);
        });

        it('should reject invalid amount', () => {
            assert.throws(() => validateTransactionData({
                user_id: 1,
                amount: -10,
                payment_method: 'stripe',
                status: 'completed'
            }), /amount must be a non-negative number/);

            assert.throws(() => validateTransactionData({
                user_id: 1,
                amount: 'invalid',
                payment_method: 'stripe',
                status: 'completed'
            }), /amount must be a non-negative number/);
        });

        it('should reject cash payment method', () => {
            assert.throws(() => validateTransactionData({
                user_id: 1,
                amount: 50,
                payment_method: 'cash',
                status: 'completed'
            }), /Invalid payment method: cash/);
        });

        it('should enforce business rules', () => {
            // In-person payments should be outstanding or completed
            assert.throws(() => validateTransactionData({
                user_id: 1,
                amount: 50,
                payment_method: 'in-person',
                status: 'pending'
            }), /In-person payments must have status "outstanding" or "completed"/);

            // Credit transactions should have amount of 0
            assert.throws(() => validateTransactionData({
                user_id: 1,
                amount: 50,
                payment_method: 'credits',
                status: 'completed'
            }), /Credit transactions should have amount of 0/);
        });
    });

    describe('Constants', () => {
        it('should export valid payment methods', () => {
            assert.deepStrictEqual(VALID_PAYMENT_METHODS, ['stripe', 'credits', 'in-person']);
        });

        it('should export valid transaction statuses', () => {
            assert.deepStrictEqual(VALID_TRANSACTION_STATUSES, ['pending', 'completed', 'failed', 'outstanding']);
        });
    });
});
