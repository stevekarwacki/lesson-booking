/**
 * Payment validation utilities to catch invalid values before they hit the database
 * This is especially important for SQLite which doesn't enforce enum constraints
 */

// Valid payment methods (must match the database enum)
const VALID_PAYMENT_METHODS = ['stripe', 'credits', 'in-person'];

// Valid transaction statuses (must match the database enum)
const VALID_TRANSACTION_STATUSES = ['pending', 'completed', 'failed', 'outstanding'];

/**
 * Validates a payment method value
 * @param {string} paymentMethod - The payment method to validate
 * @throws {Error} If payment method is invalid
 * @returns {string} The validated payment method
 */
function validatePaymentMethod(paymentMethod) {
    if (!paymentMethod || typeof paymentMethod !== 'string') {
        throw new Error('Payment method is required and must be a string');
    }

    const normalizedMethod = paymentMethod.toLowerCase().trim();
    
    if (!VALID_PAYMENT_METHODS.includes(normalizedMethod)) {
        throw new Error(`Invalid payment method: ${paymentMethod}. Valid options are: ${VALID_PAYMENT_METHODS.join(', ')}`);
    }

    return normalizedMethod;
}

/**
 * Validates a transaction status value
 * @param {string} status - The transaction status to validate
 * @throws {Error} If status is invalid
 * @returns {string} The validated status
 */
function validateTransactionStatus(status) {
    if (!status || typeof status !== 'string') {
        throw new Error('Transaction status is required and must be a string');
    }

    const normalizedStatus = status.toLowerCase().trim();
    
    if (!VALID_TRANSACTION_STATUSES.includes(normalizedStatus)) {
        throw new Error(`Invalid transaction status: ${status}. Valid options are: ${VALID_TRANSACTION_STATUSES.join(', ')}`);
    }

    return normalizedStatus;
}

/**
 * Validates transaction data before database operations
 * @param {Object} transactionData - Transaction data to validate
 * @param {number} transactionData.user_id - User ID
 * @param {number} transactionData.amount - Transaction amount
 * @param {string} transactionData.payment_method - Payment method
 * @param {string} transactionData.status - Transaction status
 * @throws {Error} If any validation fails
 * @returns {Object} Validated and normalized transaction data
 */
function validateTransactionData(transactionData) {
    const errors = [];

    // Validate user_id
    if (!transactionData.user_id || !Number.isInteger(transactionData.user_id) || transactionData.user_id <= 0) {
        errors.push('user_id must be a positive integer');
    }

    // Validate amount
    if (transactionData.amount === undefined || transactionData.amount === null) {
        errors.push('amount is required');
    } else if (typeof transactionData.amount !== 'number' || transactionData.amount < 0) {
        errors.push('amount must be a non-negative number');
    }

    // Validate payment method
    let validatedPaymentMethod;
    try {
        validatedPaymentMethod = validatePaymentMethod(transactionData.payment_method);
    } catch (error) {
        errors.push(error.message);
    }

    // Validate status
    let validatedStatus;
    try {
        validatedStatus = validateTransactionStatus(transactionData.status);
    } catch (error) {
        errors.push(error.message);
    }

    // Business logic validation
    if (validatedPaymentMethod === 'in-person' && validatedStatus !== 'outstanding' && validatedStatus !== 'completed') {
        errors.push('In-person payments must have status "outstanding" or "completed"');
    }

    if (validatedPaymentMethod === 'credits' && transactionData.amount > 0) {
        errors.push('Credit transactions should have amount of 0');
    }

    if (errors.length > 0) {
        throw new Error(`Transaction validation failed: ${errors.join(', ')}`);
    }

    return {
        ...transactionData,
        payment_method: validatedPaymentMethod,
        status: validatedStatus
    };
}

/**
 * Checks if a payment method is valid
 * @param {string} paymentMethod - Payment method to check
 * @returns {boolean} True if valid, false otherwise
 */
function isValidPaymentMethod(paymentMethod) {
    try {
        validatePaymentMethod(paymentMethod);
        return true;
    } catch {
        return false;
    }
}

/**
 * Checks if a transaction status is valid
 * @param {string} status - Status to check
 * @returns {boolean} True if valid, false otherwise
 */
function isValidTransactionStatus(status) {
    try {
        validateTransactionStatus(status);
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    VALID_PAYMENT_METHODS,
    VALID_TRANSACTION_STATUSES,
    validatePaymentMethod,
    validateTransactionStatus,
    validateTransactionData,
    isValidPaymentMethod,
    isValidTransactionStatus
};
