/**
 * Form Validation Helpers
 * 
 * Pure validation functions using Zod schemas from /common/schemas.
 * These are implementation-agnostic adapters that bridge Zod with frontend forms.
 */

import { profileSchemaFlat } from '@common/schemas/index.mjs'

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
 * Validate user profile data using Zod schema
 * @param {Object} data - Profile data to validate (flat structure)
 * @returns {Object} - { valid: boolean, errors: Object }
 */
export const validateProfileData = (data) => {
    // Use Zod schema for validation
    const result = profileSchemaFlat.safeParse(data)
    
    if (result.success) {
        return {
            valid: true,
            errors: {}
        }
    }
    
    // Transform Zod errors to flat object for easy field lookup
    const errors = {}
    result.error.issues.forEach(issue => {
        const fieldName = issue.path.join('.')
        errors[fieldName] = issue.message
    })
    
    return {
        valid: false,
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

