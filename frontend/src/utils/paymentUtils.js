/**
 * Frontend utilities for payment status handling
 * These mirror the backend utils but are adapted for frontend use
 */

/**
 * Gets payment status color based on transaction status and attendance
 * @param {Object} transaction - Transaction object with status and payment_method
 * @param {Object} attendance - Optional attendance object with status
 * @returns {string} - CSS color value
 */
export function getPaymentStatusColor(transaction, attendance = null) {
    if (!transaction) return '#6b7280'; // gray

    // Only apply special colors for in-person payments
    if (transaction.payment_method !== 'in-person') {
        return '#6b7280'; // gray for other payment methods
    }

    if (transaction.status === 'completed') {
        return '#059669'; // green
    }

    if (transaction.status === 'outstanding') {
        // No attendance marked yet - yellow (payment due but lesson status unknown)
        if (!attendance || attendance.status === null || attendance.status === undefined) {
            return '#d97706'; // yellow
        }
        
        // Student marked as present but payment not received - red (priority)
        if (attendance.status === 'present') {
            return '#dc2626'; // red
        }
        
        // Student absent or tardy - still yellow (payment due but attendance issue)
        return '#d97706'; // yellow
    }

    // Default for other statuses (pending, failed, etc.)
    return '#6b7280'; // gray
}

/**
 * Gets a human-readable payment status message
 * @param {Object} transaction - Transaction object with status and payment_method
 * @param {Object} attendance - Optional attendance object with status
 * @returns {string} - Human-readable status message
 */
export function getPaymentStatusMessage(transaction, attendance = null) {
    if (!transaction) return 'Unknown status';

    // Standard status messages for non-in-person payments
    if (transaction.payment_method !== 'in-person') {
        const statusMessages = {
            'completed': 'Payment completed',
            'pending': 'Payment pending',
            'failed': 'Payment failed'
        };
        return statusMessages[transaction.status] || 'Unknown status';
    }

    // Detailed messages for in-person payments
    if (transaction.status === 'outstanding') {
        if (!attendance || attendance.status === null || attendance.status === undefined) {
            return 'Payment due - lesson status pending';
        }
        
        if (attendance.status === 'present') {
            return 'Payment overdue - student attended lesson';
        }
        
        if (attendance.status === 'absent') {
            return 'Payment due - student was absent';
        }
        
        if (attendance.status === 'tardy') {
            return 'Payment due - student was late';
        }
    }

    if (transaction.status === 'completed') {
        return 'Payment received';
    }

    return 'Unknown payment status';
}

/**
 * Formats payment method for display
 * @param {string} method - Payment method
 * @returns {string} - Formatted payment method
 */
export function formatPaymentMethod(method) {
    const methods = {
        'stripe': 'Card Payment',
        'credits': 'Pre-paid Credits',
        'in-person': 'In-Person Payment'
    };
    return methods[method] || method;
}

/**
 * Formats payment status for display
 * @param {string} status - Payment status
 * @returns {string} - Formatted payment status
 */
export function formatPaymentStatus(status) {
    const statuses = {
        'completed': 'Paid',
        'outstanding': 'Outstanding',
        'pending': 'Pending',
        'failed': 'Failed'
    };
    return statuses[status] || status;
}
