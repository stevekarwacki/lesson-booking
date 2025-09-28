const { describe, it } = require('node:test');
const assert = require('node:assert');
const { 
    validateUserId, 
    validateCredits, 
    validateEventId, 
    validateDuration, 
    validateExpiryDate 
} = require('../utils/creditValidation');

describe('Credit Validation Utilities', () => {
    describe('validateUserId', () => {
        it('should accept valid positive integer user IDs', () => {
            assert.strictEqual(validateUserId('123'), 123);
            assert.strictEqual(validateUserId(456), 456);
            assert.strictEqual(validateUserId('1'), 1);
        });

        it('should reject invalid user IDs', () => {
            assert.throws(() => validateUserId(''), { message: 'User ID is required' });
            assert.throws(() => validateUserId(null), { message: 'User ID is required' });
            assert.throws(() => validateUserId(undefined), { message: 'User ID is required' });
            assert.throws(() => validateUserId('0'), { message: 'User ID must be a positive integer' });
            assert.throws(() => validateUserId('-5'), { message: 'User ID must be a positive integer' });
            assert.throws(() => validateUserId('abc'), { message: 'User ID must be a positive integer' });
        });
    });

    describe('validateCredits', () => {
        it('should accept valid credit amounts', () => {
            assert.strictEqual(validateCredits('5'), 5);
            assert.strictEqual(validateCredits(10), 10);
            assert.strictEqual(validateCredits('1'), 1);
            assert.strictEqual(validateCredits('1000'), 1000);
        });

        it('should reject invalid credit amounts', () => {
            assert.throws(() => validateCredits(null), { message: 'Credits amount is required' });
            assert.throws(() => validateCredits(undefined), { message: 'Credits amount is required' });
            assert.throws(() => validateCredits('0'), { message: 'Credits amount must be a positive integer' });
            assert.throws(() => validateCredits('-1'), { message: 'Credits amount must be a positive integer' });
            assert.throws(() => validateCredits('1001'), { message: 'Credits amount cannot exceed 1000' });
            assert.throws(() => validateCredits('abc'), { message: 'Credits amount must be a positive integer' });
        });
    });

    describe('validateEventId', () => {
        it('should accept valid event IDs', () => {
            assert.strictEqual(validateEventId('789'), 789);
            assert.strictEqual(validateEventId(101), 101);
            assert.strictEqual(validateEventId('1'), 1);
        });

        it('should reject invalid event IDs', () => {
            assert.throws(() => validateEventId(''), { message: 'Event ID is required' });
            assert.throws(() => validateEventId(null), { message: 'Event ID is required' });
            assert.throws(() => validateEventId(undefined), { message: 'Event ID is required' });
            assert.throws(() => validateEventId('0'), { message: 'Event ID must be a positive integer' });
            assert.throws(() => validateEventId('-10'), { message: 'Event ID must be a positive integer' });
            assert.throws(() => validateEventId('xyz'), { message: 'Event ID must be a positive integer' });
        });
    });

    describe('validateDuration', () => {
        it('should accept valid lesson durations', () => {
            assert.strictEqual(validateDuration('30'), 30);
            assert.strictEqual(validateDuration('60'), 60);
            assert.strictEqual(validateDuration(15), 15);
            assert.strictEqual(validateDuration('45'), 45);
            assert.strictEqual(validateDuration('90'), 90);
            assert.strictEqual(validateDuration('180'), 180);
        });

        it('should allow null duration for default handling', () => {
            assert.strictEqual(validateDuration(null), null);
            assert.strictEqual(validateDuration(undefined), null);
        });

        it('should reject invalid durations', () => {
            assert.throws(() => validateDuration('0'), { message: 'Duration must be a positive integer' });
            assert.throws(() => validateDuration('-30'), { message: 'Duration must be a positive integer' });
            assert.throws(() => validateDuration('10'), { message: 'Duration must be at least 15 minutes' });
            assert.throws(() => validateDuration('200'), { message: 'Duration cannot exceed 180 minutes' });
            assert.throws(() => validateDuration('25'), { message: 'Duration must be a multiple of 15 minutes' });
            assert.throws(() => validateDuration('abc'), { message: 'Duration must be a positive integer' });
        });
    });

    describe('validateExpiryDate', () => {
        it('should accept valid expiry dates', () => {
            const futureDate = new Date(Date.now() + 86400000); // Tomorrow
            assert.strictEqual(validateExpiryDate(futureDate), futureDate);
        });

        it('should allow null expiry date for no expiration', () => {
            assert.strictEqual(validateExpiryDate(null), null);
            assert.strictEqual(validateExpiryDate(undefined), null);
        });

        it('should reject invalid expiry dates', () => {
            const pastDate = new Date(Date.now() - 86400000); // Yesterday
            assert.throws(() => validateExpiryDate(pastDate), { message: 'Expiry date cannot be in the past' });
            assert.throws(() => validateExpiryDate('2024-12-31'), { message: 'Expiry date must be a Date object' });
            assert.throws(() => validateExpiryDate(123456789), { message: 'Expiry date must be a Date object' });
        });
    });

    describe('Integration scenarios', () => {
        it('should validate typical credit addition parameters', () => {
            assert.strictEqual(validateUserId('123'), 123);
            assert.strictEqual(validateCredits('5'), 5);
            assert.strictEqual(validateDuration('30'), 30);
            
            const futureDate = new Date(Date.now() + 86400000);
            assert.strictEqual(validateExpiryDate(futureDate), futureDate);
        });

        it('should validate typical credit usage parameters', () => {
            assert.strictEqual(validateUserId('456'), 456);
            assert.strictEqual(validateEventId('789'), 789);
            assert.strictEqual(validateDuration('60'), 60);
        });

        it('should handle edge cases for duration validation', () => {
            // Test boundary values
            assert.strictEqual(validateDuration('15'), 15); // Minimum valid
            assert.strictEqual(validateDuration('180'), 180); // Maximum valid
            
            // Test common lesson durations
            assert.strictEqual(validateDuration('30'), 30);
            assert.strictEqual(validateDuration('45'), 45);
            assert.strictEqual(validateDuration('60'), 60);
            assert.strictEqual(validateDuration('90'), 90);
            assert.strictEqual(validateDuration('120'), 120);
        });
    });
});
