/**
 * Profile Validation Tests
 * 
 * Tests for Zod schema validation and verification helpers
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert');

describe('Profile Schema with Zod', () => {
    let profileSchema;
    
    before(async () => {
        const schemas = await import('../common/schemas/index.mjs');
        profileSchema = schemas.profileSchema;
    });

    describe('profileSchema', () => {
        it('should pass when all fields are omitted (partial save)', () => {
            const result = profileSchema.safeParse({});
            assert.strictEqual(result.success, true);
        });

        it('should pass when only some fields are provided', () => {
            const result = profileSchema.safeParse({
                phone_number: '555-123-4567',
                address: { city: 'Seattle' }
            });
            assert.strictEqual(result.success, true);
        });

        it('should reject an invalid phone number when provided', () => {
            const result = profileSchema.safeParse({ phone_number: 'not-a-phone' });
            assert.strictEqual(result.success, false);
            assert.ok(result.error.issues.some(i => i.path.includes('phone_number')));
        });

        it('should accept an empty phone number (field cleared)', () => {
            const result = profileSchema.safeParse({ phone_number: '' });
            assert.strictEqual(result.success, true);
        });

        it('should reject an invalid ZIP code when provided', () => {
            const result = profileSchema.safeParse({ address: { zip: '123' } });
            assert.strictEqual(result.success, false);
            assert.ok(result.error.issues.some(i => i.path.includes('zip')));
        });

        it('should reject a state that is not 2 characters when provided', () => {
            const result = profileSchema.safeParse({ address: { state: 'WAA' } });
            assert.strictEqual(result.success, false);
            assert.ok(result.error.issues.some(i => i.path.includes('state')));
        });

        it('should reject an invalid email when provided', () => {
            const result = profileSchema.safeParse({ email: 'not-an-email' });
            assert.strictEqual(result.success, false);
            assert.ok(result.error.issues.some(i => i.path.includes('email')));
        });

        it('should require parent approval when is_student_minor is true', () => {
            const result = profileSchema.safeParse({ is_student_minor: true, parent_approval: false });
            assert.strictEqual(result.success, false);
            assert.ok(result.error.issues.some(i => i.path.includes('parent_approval')));
        });

        it('should pass when is_student_minor is true and parent_approval is true', () => {
            const result = profileSchema.safeParse({ is_student_minor: true, parent_approval: true });
            assert.strictEqual(result.success, true);
        });
    });
});

describe('Verification Helpers with Zod', () => {
    let verificationHelpers;
    
    before(async () => {
        verificationHelpers = require('../utils/verificationHelpers');
        // Ensure schemas are loaded
        await verificationHelpers.ensureSchemasLoaded();
    });

    describe('isVerificationComplete', () => {
        it('should return true for admins without verification data', () => {
            const admin = { role: 'admin' };
            assert.strictEqual(verificationHelpers.isVerificationComplete(admin), true);
        });

        it('should return true for instructors without verification data', () => {
            const instructor = { role: 'instructor' };
            assert.strictEqual(verificationHelpers.isVerificationComplete(instructor), true);
        });

        it('should return false for student without phone', () => {
            const student = {
                role: 'student',
                phone_number: null,
                is_student_minor: false,
                user_profile_data: {
                    address: {
                        line_1: '123 Main St',
                        city: 'Seattle',
                        state: 'WA',
                        zip: '98101'
                    }
                }
            };

            assert.strictEqual(verificationHelpers.isVerificationComplete(student), false);
        });

        it('should return false for student without address', () => {
            const student = {
                role: 'student',
                phone_number: '555-123-4567',
                is_student_minor: false,
                user_profile_data: null
            };

            assert.strictEqual(verificationHelpers.isVerificationComplete(student), false);
        });

        it('should return true for complete student profile', () => {
            const student = {
                role: 'student',
                phone_number: '555-123-4567',
                is_student_minor: false,
                user_profile_data: {
                    address: {
                        line_1: '123 Main St',
                        city: 'Seattle',
                        state: 'WA',
                        zip: '98101'
                    }
                }
            };

            assert.strictEqual(verificationHelpers.isVerificationComplete(student), true);
        });

        it('should require parent approval for minor students', () => {
            const minorWithoutApproval = {
                role: 'student',
                phone_number: '555-123-4567',
                is_student_minor: true,
                user_profile_data: {
                    address: {
                        line_1: '123 Main St',
                        city: 'Seattle',
                        state: 'WA',
                        zip: '98101'
                    }
                }
            };

            assert.strictEqual(verificationHelpers.isVerificationComplete(minorWithoutApproval), false);
        });
    });

    describe('getVerificationStatus', () => {
        it('should return correct status for incomplete student', () => {
            const student = {
                role: 'student',
                phone_number: null,
                is_approved: false
            };

            const status = verificationHelpers.getVerificationStatus(student);
            assert.strictEqual(status.complete, false);
            assert.strictEqual(status.approved, false);
            assert.strictEqual(status.needsVerification, true);
            assert.strictEqual(status.needsApproval, false);
            assert.strictEqual(status.canAccess, false);
        });

        it('should return correct status for complete but unapproved student', () => {
            const student = {
                role: 'student',
                phone_number: '555-123-4567',
                is_student_minor: false,
                is_approved: false,
                user_profile_data: {
                    address: {
                        line_1: '123 Main St',
                        city: 'Seattle',
                        state: 'WA',
                        zip: '98101'
                    }
                }
            };

            const status = verificationHelpers.getVerificationStatus(student);
            assert.strictEqual(status.complete, true);
            assert.strictEqual(status.approved, false);
            assert.strictEqual(status.needsVerification, false);
            assert.strictEqual(status.needsApproval, true);
            assert.strictEqual(status.canAccess, false);
        });

        it('should return correct status for approved student', () => {
            const student = {
                role: 'student',
                phone_number: '555-123-4567',
                is_student_minor: false,
                is_approved: true,
                user_profile_data: {
                    address: {
                        line_1: '123 Main St',
                        city: 'Seattle',
                        state: 'WA',
                        zip: '98101'
                    }
                }
            };

            const status = verificationHelpers.getVerificationStatus(student);
            assert.strictEqual(status.complete, true);
            assert.strictEqual(status.approved, true);
            assert.strictEqual(status.needsVerification, false);
            assert.strictEqual(status.needsApproval, false);
            assert.strictEqual(status.canAccess, true);
        });

        it('should allow access for approved student even when profile is incomplete', () => {
            const student = {
                role: 'student',
                phone_number: null,
                is_approved: true   // approved but missing phone / address
            };

            const status = verificationHelpers.getVerificationStatus(student);
            assert.strictEqual(status.complete, false);
            assert.strictEqual(status.approved, true);
            assert.strictEqual(status.needsVerification, true);  // CTA still shown
            assert.strictEqual(status.needsApproval, false);
            assert.strictEqual(status.canAccess, true);          // access not blocked
        });

        it('should always allow access for admins', () => {
            const admin = { role: 'admin', is_approved: false };
            const status = verificationHelpers.getVerificationStatus(admin);
            assert.strictEqual(status.canAccess, true);
        });

        it('should always allow access for instructors', () => {
            const instructor = { role: 'instructor', is_approved: false };
            const status = verificationHelpers.getVerificationStatus(instructor);
            assert.strictEqual(status.canAccess, true);
        });
    });

    describe('buildProfileData', () => {
        it('should build profile data JSON from form data', () => {
            const formData = {
                address: {
                    line_1: '123 Main St',
                    line_2: 'Apt 4B',
                    city: 'Seattle',
                    state: 'WA',
                    zip: '98101'
                },
                is_student_minor: false
            };

            const result = verificationHelpers.buildProfileData(formData);
            assert.deepStrictEqual(result.address, {
                line_1: '123 Main St',
                line_2: 'Apt 4B',
                city: 'Seattle',
                state: 'WA',
                zip: '98101'
            });
        });

        it('should include parent approval for minors', () => {
            const minorData = {
                address: {
                    line_1: '123 Main St',
                    city: 'Seattle',
                    state: 'WA',
                    zip: '98101'
                },
                is_student_minor: true,
                parent_approval: true
            };

            const result = verificationHelpers.buildProfileData(minorData);
            assert.strictEqual(result.parent_approval, true);
        });

        it('should not include parent approval for non-minors', () => {
            const adultData = {
                address: {
                    line_1: '123 Main St',
                    city: 'Seattle',
                    state: 'WA',
                    zip: '98101'
                },
                is_student_minor: false,
                parent_approval: true
            };

            const result = verificationHelpers.buildProfileData(adultData);
            assert.strictEqual(result.parent_approval, undefined);
        });

        it('should handle null line_2', () => {
            const formData = {
                address: {
                    line_1: '123 Main St',
                    line_2: null,
                    city: 'Seattle',
                    state: 'WA',
                    zip: '98101'
                },
                is_student_minor: false
            };

            const result = verificationHelpers.buildProfileData(formData);
            assert.strictEqual(result.address.line_2, null);
        });
    });
});

