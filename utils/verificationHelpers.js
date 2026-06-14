/**
 * Verification Helpers - utilities for user verification logic
 *
 * Two distinct validation concerns live here:
 *
 *  validateProfileFields(data)
 *    Format-only validation for profile SAVE routes. All fields are optional;
 *    if a field is present and non-empty its format is checked. Does NOT enforce
 *    completeness — saving partial profiles is always allowed.
 *
 *  isVerificationComplete(user)
 *    Completeness check used exclusively to drive the "Complete your Profile" CTA.
 *    Has no effect on whether a user can save data or access the system.
 */

// Load ES module schemas at startup (CommonJS can import ES modules dynamically)
let profileSchema = null;
let schemasReady = false;

// Promise that resolves when schemas are loaded
const schemasPromise = import('../common/schemas/index.mjs')
    .then(schemas => {
        profileSchema = schemas.profileSchema;
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
 * Check if user's profile verification is complete.
 *
 * Used solely to determine whether to show the "Complete your Profile" CTA.
 * Does NOT gate saves or system access — see canAccess in getVerificationStatus.
 *
 * @param {Object} user - User object with verification fields
 * @returns {boolean} - True if verification is complete
 */
const isVerificationComplete = (user) => {
    if (!user) return false;

    // Admins and instructors don't need profile verification
    if (user.role === 'admin' || user.role === 'instructor') {
        return true;
    }

    if (!user.phone_number) return false;
    if (user.is_student_minor === null || user.is_student_minor === undefined) return false;

    const profileData = user.user_profile_data;
    if (!profileData || typeof profileData !== 'object') return false;

    const address = profileData.address;
    if (!address || typeof address !== 'object') return false;
    if (!address.line_1 || !address.city || !address.state || !address.zip) return false;

    if (user.is_student_minor === true && !profileData.parent_approval) return false;

    return true;
};

/**
 * Build profile data JSON from form data.
 * @param {Object} verificationData - Form data with address, minor status, etc.
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

    if (is_student_minor === true) {
        profileData.parent_approval = parent_approval === true;
    }

    return profileData;
};

/**
 * Get user's verification status with all relevant flags.
 *
 * canAccess:
 *   Non-students always have access.
 *   Students need only is_approved — profile completeness does not block access.
 *   The "Complete your Profile" CTA (driven by needsVerification) is informational only.
 *
 * needsVerification:
 *   True for students with an incomplete profile. Drives the "Complete your Profile" CTA.
 *   Does not affect routing or saving.
 *
 * needsApproval:
 *   True for students whose profile is complete but account is not yet approved.
 *   Drives the "Account Pending Approval" CTA.
 *
 * @param {Object} user
 * @returns {{ complete, approved, needsVerification, needsApproval, canAccess }}
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
        needsApproval: complete && !approved && user.role === 'student',
        // Approved students can access the system regardless of profile completeness
        canAccess: (user.role !== 'student') || approved
    };
};

/**
 * Validate the FORMAT of profile fields submitted for saving.
 *
 * All fields are optional. If a field is present and non-empty its format is
 * checked (phone regex, ZIP regex, 2-char state, valid email, minor/approval
 * cross-field rule). Empty strings are allowed — they clear the stored value.
 *
 * Use this on all profile SAVE routes (self-service and admin).
 *
 * @param {Object} data - Request body from a profile save route
 * @returns {{ valid: boolean, errors: Object }}
 */
const validateProfileFields = (data) => {
    if (!schemasReady) {
        throw new Error('Validation schemas not loaded yet. Call ensureSchemasLoaded() and await it before using validation.');
    }

    const result = profileSchema.safeParse(data);

    if (result.success) {
        return { valid: true, errors: {} };
    }

    const errors = {};
    result.error.issues.forEach(issue => {
        const path = issue.path.join('.');
        if (path.startsWith('address.')) {
            errors[path.replace('address.', '')] = issue.message;
        } else {
            errors[path] = issue.message;
        }
    });

    return { valid: false, errors };
};

module.exports = {
    isVerificationComplete,
    buildProfileData,
    getVerificationStatus,
    validateProfileFields,
    ensureSchemasLoaded
};
