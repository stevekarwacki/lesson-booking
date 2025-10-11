const { describe, it } = require('node:test');
const assert = require('node:assert');
const { 
    canUserUseInPersonPayment, 
    getPaymentStatusColor, 
    getPaymentStatusMessage,
    isValidInPersonPaymentOverride 
} = require('../utils/inPersonPaymentUtils');

describe('In-Person Payment Utilities', () => {
    describe('User Eligibility Logic', () => {
        it('should return true when user override is enabled', async () => {
            const user = { in_person_payment_override: 'enabled' };
            
            // Should return true regardless of global setting
            const canUseWithGlobalFalse = await canUserUseInPersonPayment(user, false);
            const canUseWithGlobalTrue = await canUserUseInPersonPayment(user, true);
            
            assert.strictEqual(canUseWithGlobalFalse, true);
            assert.strictEqual(canUseWithGlobalTrue, true);
        });

        it('should return false when user override is disabled', async () => {
            const user = { in_person_payment_override: 'disabled' };
            
            // Should return false regardless of global setting
            const canUseWithGlobalFalse = await canUserUseInPersonPayment(user, false);
            const canUseWithGlobalTrue = await canUserUseInPersonPayment(user, true);
            
            assert.strictEqual(canUseWithGlobalFalse, false);
            assert.strictEqual(canUseWithGlobalTrue, false);
        });

        it('should use global setting when no user override', async () => {
            const user = { in_person_payment_override: null };
            
            const canUseWithGlobalFalse = await canUserUseInPersonPayment(user, false);
            const canUseWithGlobalTrue = await canUserUseInPersonPayment(user, true);
            
            assert.strictEqual(canUseWithGlobalFalse, false);
            assert.strictEqual(canUseWithGlobalTrue, true);
        });
    });

    describe('Payment Status Colors', () => {
        it('should return green for completed payments', () => {
            const transaction = { status: 'completed', payment_method: 'in-person' };
            const color = getPaymentStatusColor(transaction);
            assert.strictEqual(color, 'green');
        });

        it('should return yellow for outstanding payments with no attendance', () => {
            const transaction = { status: 'outstanding', payment_method: 'in-person' };
            const color = getPaymentStatusColor(transaction, null);
            assert.strictEqual(color, 'yellow');

            const colorWithNullStatus = getPaymentStatusColor(transaction, { status: null });
            assert.strictEqual(colorWithNullStatus, 'yellow');
        });

        it('should return red for outstanding payments with present attendance', () => {
            const transaction = { status: 'outstanding', payment_method: 'in-person' };
            const attendance = { status: 'present' };
            const color = getPaymentStatusColor(transaction, attendance);
            assert.strictEqual(color, 'red');
        });

        it('should return yellow for outstanding payments with absent/tardy attendance', () => {
            const transaction = { status: 'outstanding', payment_method: 'in-person' };
            
            const colorAbsent = getPaymentStatusColor(transaction, { status: 'absent' });
            assert.strictEqual(colorAbsent, 'yellow');

            const colorTardy = getPaymentStatusColor(transaction, { status: 'tardy' });
            assert.strictEqual(colorTardy, 'yellow');
        });

        it('should return gray for other statuses', () => {
            const pendingTransaction = { status: 'pending', payment_method: 'stripe' };
            const failedTransaction = { status: 'failed', payment_method: 'stripe' };
            
            assert.strictEqual(getPaymentStatusColor(pendingTransaction), 'gray');
            assert.strictEqual(getPaymentStatusColor(failedTransaction), 'gray');
            assert.strictEqual(getPaymentStatusColor(null), 'gray');
        });
    });

    describe('Payment Status Messages', () => {
        it('should return appropriate messages for different statuses', () => {
            assert.strictEqual(
                getPaymentStatusMessage({ status: 'completed' }),
                'Payment received'
            );
            assert.strictEqual(
                getPaymentStatusMessage({ status: 'pending' }),
                'Payment processing'
            );
            assert.strictEqual(
                getPaymentStatusMessage({ status: 'failed' }),
                'Payment failed'
            );
        });

        it('should return detailed messages for outstanding in-person payments', () => {
            const transaction = { status: 'outstanding', payment_method: 'in-person' };
            
            assert.strictEqual(
                getPaymentStatusMessage(transaction, null),
                'Payment due in-person'
            );
            assert.strictEqual(
                getPaymentStatusMessage(transaction, { status: 'present' }),
                'Payment overdue (student attended)'
            );
            assert.strictEqual(
                getPaymentStatusMessage(transaction, { status: 'absent' }),
                'Payment due (student absent)'
            );
            assert.strictEqual(
                getPaymentStatusMessage(transaction, { status: 'tardy' }),
                'Payment due (student tardy)'
            );
        });
    });

    describe('Validation Utilities', () => {
        it('should validate in-person payment override values', () => {
            assert.strictEqual(isValidInPersonPaymentOverride(null), true);
            assert.strictEqual(isValidInPersonPaymentOverride('enabled'), true);
            assert.strictEqual(isValidInPersonPaymentOverride('disabled'), true);
            assert.strictEqual(isValidInPersonPaymentOverride('invalid'), false);
            assert.strictEqual(isValidInPersonPaymentOverride(''), false);
        });
    });
});
