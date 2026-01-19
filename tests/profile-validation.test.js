/**
 * Profile Validation Tests
 * 
 * Tests for Zod schema validation and verification helpers
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert');

describe('Profile Validation with Zod', () => {
    let profileSchemaFlat, profileSchemaNested;
    
    before(async () => {
        // Load ES module schemas
        const schemas = await import('../common/schemas/index.mjs');
        profileSchemaFlat = schemas.profileSchemaFlat;
        profileSchemaNested = schemas.profileSchemaNested;
    });

    describe('profileSchemaFlat', () => {
        it('should validate valid profile data', () => {
            const validData = {
                phone_number: '555-123-4567',
                address_line_1: '123 Main St',
                address_line_2: '',
                city: 'Seattle',
                state: 'WA',
                zip: '98101',
                is_minor: false
            };

            const result = profileSchemaFlat.safeParse(validData);
            assert.strictEqual(result.success, true);
        });

        it('should require phone number', () => {
            const invalidData = {
                phone_number: '',
                address_line_1: '123 Main St',
                city: 'Seattle',
                state: 'WA',
                zip: '98101',
                is_minor: false
            };

            const result = profileSchemaFlat.safeParse(invalidData);
            assert.strictEqual(result.success, false);
            assert.ok(result.error.issues.some(issue => 
                issue.path.includes('phone_number')
            ));
        });

        it('should validate phone number format', () => {
            const invalidData = {
                phone_number: 'abc-def-ghij',
                address_line_1: '123 Main St',
                city: 'Seattle',
                state: 'WA',
                zip: '98101',
                is_minor: false
            };

            const result = profileSchemaFlat.safeParse(invalidData);
            assert.strictEqual(result.success, false);
        });

        it('should require address line 1', () => {
            const invalidData = {
                phone_number: '555-123-4567',
                address_line_1: '',
                city: 'Seattle',
                state: 'WA',
                zip: '98101',
                is_minor: false
            };

            const result = profileSchemaFlat.safeParse(invalidData);
            assert.strictEqual(result.success, false);
        });

        it('should validate ZIP code format', () => {
            const invalidZip = {
                phone_number: '555-123-4567',
                address_line_1: '123 Main St',
                city: 'Seattle',
                state: 'WA',
                zip: '123',
                is_minor: false
            };

            const result = profileSchemaFlat.safeParse(invalidZip);
            assert.strictEqual(result.success, false);
        });

        it('should accept valid 5-digit ZIP code', () => {
            const validData = {
                phone_number: '555-123-4567',
                address_line_1: '123 Main St',
                city: 'Seattle',
                state: 'WA',
                zip: '98101',
                is_minor: false
            };

            const result = profileSchemaFlat.safeParse(validData);
            assert.strictEqual(result.success, true);
        });

        it('should accept valid ZIP+4 format', () => {
            const validData = {
                phone_number: '555-123-4567',
                address_line_1: '123 Main St',
                city: 'Seattle',
                state: 'WA',
                zip: '98101-1234',
                is_minor: false
            };

            const result = profileSchemaFlat.safeParse(validData);
            assert.strictEqual(result.success, true);
        });

        it('should require parent approval for minors', () => {
            const minorWithoutApproval = {
                phone_number: '555-123-4567',
                address_line_1: '123 Main St',
                city: 'Seattle',
                state: 'WA',
                zip: '98101',
                is_minor: true,
                parent_approval: false
            };

            const result = profileSchemaFlat.safeParse(minorWithoutApproval);
            assert.strictEqual(result.success, false);
            assert.ok(result.error.issues.some(issue => 
                issue.message.includes('Parent approval')
            ));
        });

        it('should allow minors with parent approval', () => {
            const minorWithApproval = {
                phone_number: '555-123-4567',
                address_line_1: '123 Main St',
                city: 'Seattle',
                state: 'WA',
                zip: '98101',
                is_minor: true,
                parent_approval: true
            };

            const result = profileSchemaFlat.safeParse(minorWithApproval);
            assert.strictEqual(result.success, true);
        });

        it('should trim whitespace from string fields', () => {
            const dataWithSpaces = {
                phone_number: '  555-123-4567  ',
                address_line_1: '  123 Main St  ',
                city: '  Seattle  ',
                state: 'WA',
                zip: '  98101  ',
                is_minor: false
            };

            const result = profileSchemaFlat.safeParse(dataWithSpaces);
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.data.phone_number, '555-123-4567');
            assert.strictEqual(result.data.address_line_1, '123 Main St');
        });
    });

    describe('profileSchemaNested', () => {
        it('should validate nested address structure', () => {
            const validData = {
                phone_number: '555-123-4567',
                is_student_minor: false,
                address: {
                    line_1: '123 Main St',
                    line_2: null,
                    city: 'Seattle',
                    state: 'WA',
                    zip: '98101'
                }
            };

            const result = profileSchemaNested.safeParse(validData);
            assert.strictEqual(result.success, true);
        });

        it('should require all address fields', () => {
            const missingCity = {
                phone_number: '555-123-4567',
                is_student_minor: false,
                address: {
                    line_1: '123 Main St',
                    line_2: null,
                    city: '',
                    state: 'WA',
                    zip: '98101'
                }
            };

            const result = profileSchemaNested.safeParse(missingCity);
            assert.strictEqual(result.success, false);
        });

        it('should require parent approval for minors', () => {
            const minorWithoutApproval = {
                phone_number: '555-123-4567',
                is_student_minor: true,
                parent_approval: false,
                address: {
                    line_1: '123 Main St',
                    line_2: null,
                    city: 'Seattle',
                    state: 'WA',
                    zip: '98101'
                }
            };

            const result = profileSchemaNested.safeParse(minorWithoutApproval);
            assert.strictEqual(result.success, false);
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

    describe('validateVerificationData', () => {
        it('should validate correct data', () => {
            const validData = {
                phone_number: '555-123-4567',
                is_student_minor: false,
                address: {
                    line_1: '123 Main St',
                    line_2: null,
                    city: 'Seattle',
                    state: 'WA',
                    zip: '98101'
                }
            };

            const result = verificationHelpers.validateVerificationData(validData);
            assert.strictEqual(result.valid, true);
            assert.deepStrictEqual(result.errors, {});
        });

        it('should flatten address errors for convenience', () => {
            const invalidData = {
                phone_number: '555-123-4567',
                is_student_minor: false,
                address: {
                    line_1: '',
                    city: '',
                    state: 'X',
                    zip: '123'
                }
            };

            const result = verificationHelpers.validateVerificationData(invalidData);
            assert.strictEqual(result.valid, false);
            
            // Errors should be flattened (e.g., 'line_1' not 'address.line_1')
            assert.ok(result.errors.line_1);
            assert.ok(result.errors.city);
            assert.ok(result.errors.state);
            assert.ok(result.errors.zip);
        });

        it('should detect invalid phone numbers', () => {
            const invalidData = {
                phone_number: 'not-a-phone',
                is_student_minor: false,
                address: {
                    line_1: '123 Main St',
                    city: 'Seattle',
                    state: 'WA',
                    zip: '98101'
                }
            };

            const result = verificationHelpers.validateVerificationData(invalidData);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.phone_number);
        });

        it('should require parent approval for minors', () => {
            const minorData = {
                phone_number: '555-123-4567',
                is_student_minor: true,
                // Missing parent_approval
                address: {
                    line_1: '123 Main St',
                    city: 'Seattle',
                    state: 'WA',
                    zip: '98101'
                }
            };

            const result = verificationHelpers.validateVerificationData(minorData);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.parent_approval);
        });
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

