/**
 * Frontend Verification Helpers
 * 
 * Client-side validation for verification data.
 * Mirrors backend validation rules in utils/verificationHelpers.js
 */

/**
 * Validate verification form data
 * @param {Object} data - Form data to validate
 * @returns {Object} - { valid: boolean, errors: Object }
 */
export const validateVerificationData = (data) => {
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

