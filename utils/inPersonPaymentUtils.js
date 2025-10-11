const { AppSettings } = require('../models/AppSettings');

/**
 * Determines if a user can use in-person payment based on global setting and user override
 * @param {Object} user - User object with in_person_payment_override field
 * @param {boolean} globalSetting - Global in-person payment enabled setting (optional, will fetch if not provided)
 * @returns {Promise<boolean>} - True if user can use in-person payment
 */
async function canUserUseInPersonPayment(user, globalSetting = null) {
    try {
        // If user has explicit override, use that
        if (user.in_person_payment_override === 'enabled') {
            return true;
        }
        if (user.in_person_payment_override === 'disabled') {
            return false;
        }
        
        // If no override, use global setting
        if (globalSetting === null) {
            globalSetting = await AppSettings.getInPersonPaymentEnabled();
        }
        
        return globalSetting;
    } catch (error) {
        console.error('Error checking in-person payment eligibility:', error);
        // Default to false on error for security
        return false;
    }
}

/**
 * Gets payment status color based on transaction status and attendance
 * @param {Object} transaction - Transaction object with status field
 * @param {Object} attendance - Attendance object with status field (can be null)
 * @returns {string} - Color indicator: 'green', 'yellow', 'red', or 'gray'
 */
function getPaymentStatusColor(transaction, attendance = null) {
    if (!transaction) return 'gray';
    
    // Completed payments are always green
    if (transaction.status === 'completed') {
        return 'green';
    }
    
    // Outstanding in-person payments
    if (transaction.status === 'outstanding' && transaction.payment_method === 'in-person') {
        // No attendance marked yet - yellow (payment due but lesson status unknown)
        if (!attendance || attendance.status === null) {
            return 'yellow';
        }
        
        // Student was present but payment not received - red (urgent)
        if (attendance.status === 'present') {
            return 'red';
        }
        
        // Student was absent or tardy - yellow (less urgent)
        return 'yellow';
    }
    
    // Other statuses (pending, failed, etc.)
    return 'gray';
}

/**
 * Gets a human-readable payment status message
 * @param {Object} transaction - Transaction object
 * @param {Object} attendance - Attendance object (can be null)
 * @returns {string} - Status message
 */
function getPaymentStatusMessage(transaction, attendance = null) {
    if (!transaction) return 'Unknown status';
    
    switch (transaction.status) {
        case 'completed':
            return 'Payment received';
        case 'outstanding':
            if (transaction.payment_method === 'in-person') {
                if (!attendance || attendance.status === null) {
                    return 'Payment due in-person';
                }
                if (attendance.status === 'present') {
                    return 'Payment overdue (student attended)';
                }
                if (attendance.status === 'absent') {
                    return 'Payment due (student absent)';
                }
                if (attendance.status === 'tardy') {
                    return 'Payment due (student tardy)';
                }
            }
            return 'Payment outstanding';
        case 'pending':
            return 'Payment processing';
        case 'failed':
            return 'Payment failed';
        default:
            return 'Unknown status';
    }
}

/**
 * Validates in-person payment override value
 * @param {string} override - Override value to validate
 * @returns {boolean} - True if valid
 */
function isValidInPersonPaymentOverride(override) {
    return override === null || override === 'enabled' || override === 'disabled';
}

module.exports = {
    canUserUseInPersonPayment,
    getPaymentStatusColor,
    getPaymentStatusMessage,
    isValidInPersonPaymentOverride
};
