/**
 * Form Validation Helpers
 * 
 * Pure validation functions that are implementation-agnostic.
 * These can be used with any form, validation approach, or UI framework.
 */

/**
 * Validates that two password values match
 * @param {string} password - The password value
 * @param {string} confirmPassword - The confirmation password value
 * @returns {Object} { valid: boolean, error: string | null }
 */
export const validatePasswordsMatch = (password, confirmPassword) => {
    // If either field is empty, no validation error (handled by required attribute)
    if (!password && !confirmPassword) {
        return { valid: true, error: null }
    }
    
    // If confirm password is empty but password exists, that's handled by required
    if (password && !confirmPassword) {
        return { valid: true, error: null }
    }
    
    // Both have values - check if they match
    if (password !== confirmPassword) {
        return { valid: false, error: 'Passwords do not match' }
    }
    
    return { valid: true, error: null }
}

/**
 * Validates password strength (optional - can be used for additional validation)
 * @param {string} password - The password to validate
 * @param {Object} options - Validation options
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validatePasswordStrength = (password, options = {}) => {
    const {
        minLength = 8,
        requireUppercase = false,
        requireLowercase = false,
        requireNumbers = false,
        requireSpecialChars = false
    } = options
    
    const errors = []
    
    if (!password) {
        return { valid: true, errors: [] }
    }
    
    if (password.length < minLength) {
        errors.push(`Password must be at least ${minLength} characters`)
    }
    
    if (requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter')
    }
    
    if (requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter')
    }
    
    if (requireNumbers && !/\d/.test(password)) {
        errors.push('Password must contain at least one number')
    }
    
    if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character')
    }
    
    return {
        valid: errors.length === 0,
        errors
    }
}

/**
 * Validate user profile data
 * @param {Object} data - Profile data to validate
 * @returns {Object} - { valid: boolean, errors: Object }
 */
export const validateProfileData = (data) => {
    const errors = {}
    
    // Phone number validation
    if (!data.phone_number || !data.phone_number.trim()) {
        errors.phone_number = 'Phone number is required'
    } else if (!/^[+]?[\d\s\-()]+$/.test(data.phone_number)) {
        errors.phone_number = 'Invalid phone number format'
    }
    
    // Address line 1 validation
    if (!data.address_line_1 || !data.address_line_1.trim()) {
        errors.address_line_1 = 'Address is required'
    }
    
    // City validation
    if (!data.city || !data.city.trim()) {
        errors.city = 'City is required'
    }
    
    // State validation
    if (!data.state) {
        errors.state = 'State is required'
    }
    
    // ZIP code validation
    if (!data.zip || !data.zip.trim()) {
        errors.zip = 'ZIP code is required'
    } else if (!/^\d{5}(-\d{4})?$/.test(data.zip.trim())) {
        errors.zip = 'ZIP code must be in format 12345 or 12345-6789'
    }
    
    // Minor status validation (must be explicitly set)
    if (data.is_minor === null || data.is_minor === undefined) {
        errors.is_minor = 'Must specify if student is a minor'
    }
    
    // Parent approval validation (only if minor)
    if (data.is_minor === true && !data.parent_approval) {
        errors.parent_approval = 'Parent approval is required for minors'
    }
    
    return {
        valid: Object.keys(errors).length === 0,
        errors
    }
}

/**
 * Format address object into a readable string
 * @param {Object} address - Address object with line_1, line_2, city, state, zip
 * @returns {string} - Formatted address string
 */
export const formatAddress = (address) => {
    if (!address) return 'Not provided'
    
    const parts = [
        address.line_1,
        address.line_2,
        address.city,
        `${address.state} ${address.zip}`
    ].filter(Boolean) // Remove empty/null parts
    
    return parts.join(', ')
}

