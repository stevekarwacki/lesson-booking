/**
 * Verification Helpers - utilities for user verification logic
 * 
 * For checking verification completeness and building verification data.
 * Validation now uses Zod schemas from /common/schemas (ES modules)
 */

// Load ES module schemas at startup (CommonJS can import ES modules dynamically)
let profileSchemaNested = null;
let schemasReady = false;

// Promise that resolves when schemas are loaded
const schemasPromise = import('../common/schemas/index.mjs')
    .then(schemas => {
        profileSchemaNested = schemas.profileSchemaNested;
        schemasReady = true;
        return schemas;
    })
    .catch(err => {
        console.error('Failed to load validation schemas:', err);
        process.exit(1);
    });

// Export promise for routes that need to ensure schemas are loaded
const ensureSchemasLoaded = () => schemasPromise;

/**
 * Check if user's profile verification is complete
 * @param {Object} user - User object with verification fields
 * @returns {boolean} - True if verification is complete
 */
const isVerificationComplete = (user) => {
    if (!user) return false;
    
    // Admins and instructors don't need verification
    if (user.role === 'admin' || user.role === 'instructor') {
        return true;
    }
    
    // Check required fields
    if (!user.phone_number) return false;
    if (user.is_student_minor === null || user.is_student_minor === undefined) return false;
    
    // Check profile data JSON
    const profileData = user.user_profile_data;
    if (!profileData || typeof profileData !== 'object') return false;
    
    // Check address fields
    const address = profileData.address;
    if (!address || typeof address !== 'object') return false;
    if (!address.line_1 || !address.city || !address.state || !address.zip) return false;
    
    // If minor, must have parent approval
    if (user.is_student_minor === true && !profileData.parent_approval) return false;
    
    return true;
};

/**
 * Build profile data JSON from verification form data
 * @param {Object} verificationData - Form data with phone, address, minor status, etc.
 * @returns {Object} - Structured profile data ready for database storage
 */
const buildProfileData = (verificationData) => {
    const { address, is_student_minor, parent_approval } = verificationData;
    
    const profileData = {
        address: {
            line_1: address?.line_1?.trim() || '',
            line_2: address?.line_2?.trim() || null,
            city: address?.city?.trim() || '',
            state: address?.state?.trim() || '',
            zip: address?.zip?.trim() || ''
        }
    };
    
    // Add parent approval if user is a minor
    if (is_student_minor === true) {
        profileData.parent_approval = parent_approval === true;
    }
    
    return profileData;
};

/**
 * Get user's verification status with all relevant flags
 * @param {Object} user - User object
 * @returns {Object} - Status object with complete, approved, needs* flags
 */
const getVerificationStatus = (user) => {
    if (!user) {
        return { 
            complete: false, 
            approved: false,
            needsVerification: false,
            needsApproval: false,
            canAccess: false
        };
    }
    
    const complete = isVerificationComplete(user);
    const approved = user.is_approved === true;
    
    return {
        complete,
        approved,
        needsVerification: !complete && user.role === 'student',
        needsApproval: complete && !approved,
        canAccess: (user.role !== 'student') || (complete && approved)
    };
};

/**
 * Validate verification form data using Zod schema
 * @param {Object} verificationData - Form data to validate
 * @returns {Object} - { valid: boolean, errors: Object }
 */
const validateVerificationData = (verificationData) => {
    // Schemas load at module initialization and should be ready by the time routes are called
    // In the rare case they're not, provide a helpful error
    if (!schemasReady) {
        throw new Error('Validation schemas not loaded yet. Call ensureSchemasLoaded() and await it before using validation.');
    }
    
    // Use Zod schema for validation
    const result = profileSchemaNested.safeParse(verificationData);
    
    if (result.success) {
        return {
            valid: true,
            errors: {}
        };
    }
    
    // Transform Zod errors to flat structure for backward compatibility
    const errors = {};
    result.error.issues.forEach(issue => {
        const path = issue.path.join('.');
        
        // Flatten address.field_name to field_name for convenience
        // This maintains backward compatibility with existing error handling
        if (path.startsWith('address.')) {
            const fieldName = path.replace('address.', '');
            errors[fieldName] = issue.message;
        } else {
            errors[path] = issue.message;
        }
    });
    
    return {
        valid: false,
        errors
    };
};

module.exports = {
    isVerificationComplete,
    buildProfileData,
    getVerificationStatus,
    validateVerificationData,
    ensureSchemasLoaded
};

