/**
 * Credit validation utilities
 * Provides consistent validation patterns for credit operations
 */

/**
 * Validates user ID parameter
 * @param {*} userId - User ID to validate
 * @throws {Error} If validation fails
 */
const validateUserId = (userId) => {
    if (!userId) {
        throw new Error('User ID is required');
    }
    
    const id = parseInt(userId);
    if (isNaN(id) || id <= 0) {
        throw new Error('User ID must be a positive integer');
    }
    
    return id;
};

/**
 * Validates credits amount
 * @param {*} credits - Credits amount to validate
 * @throws {Error} If validation fails
 */
const validateCredits = (credits) => {
    if (credits === null || credits === undefined) {
        throw new Error('Credits amount is required');
    }
    
    const amount = parseInt(credits);
    if (isNaN(amount) || amount <= 0) {
        throw new Error('Credits amount must be a positive integer');
    }
    
    if (amount > 1000) {
        throw new Error('Credits amount cannot exceed 1000');
    }
    
    return amount;
};

/**
 * Validates event ID parameter
 * @param {*} eventId - Event ID to validate
 * @throws {Error} If validation fails
 */
const validateEventId = (eventId) => {
    if (!eventId) {
        throw new Error('Event ID is required');
    }
    
    const id = parseInt(eventId);
    if (isNaN(id) || id <= 0) {
        throw new Error('Event ID must be a positive integer');
    }
    
    return id;
};

/**
 * Validates duration in minutes
 * @param {*} durationMinutes - Duration to validate
 * @throws {Error} If validation fails
 */
const validateDuration = (durationMinutes) => {
    if (durationMinutes === null || durationMinutes === undefined) {
        return null; // Allow null for methods that fetch default from settings
    }
    
    const duration = parseInt(durationMinutes);
    if (isNaN(duration) || duration <= 0) {
        throw new Error('Duration must be a positive integer');
    }
    
    if (duration < 15) {
        throw new Error('Duration must be at least 15 minutes');
    }
    
    if (duration > 180) {
        throw new Error('Duration cannot exceed 180 minutes');
    }
    
    // Validate it's a multiple of 15 (since slots are 15 minutes)
    if (duration % 15 !== 0) {
        throw new Error('Duration must be a multiple of 15 minutes');
    }
    
    return duration;
};

/**
 * Validates expiry date
 * @param {*} expiryDate - Expiry date to validate
 * @throws {Error} If validation fails
 */
const validateExpiryDate = (expiryDate) => {
    if (expiryDate === null || expiryDate === undefined) {
        return null; // Allow null for no expiry
    }
    
    if (!(expiryDate instanceof Date)) {
        throw new Error('Expiry date must be a Date object');
    }
    
    if (expiryDate < new Date()) {
        throw new Error('Expiry date cannot be in the past');
    }
    
    return expiryDate;
};

module.exports = {
    validateUserId,
    validateCredits,
    validateEventId,
    validateDuration,
    validateExpiryDate
};
