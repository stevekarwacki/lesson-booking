/**
 * Profile Data Tests
 * 
 * Tests for profile data persistence and admin editing
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { User } = require('../models/User');
const { sequelize } = require('../db/index');
const bcrypt = require('bcrypt');

// Import models to ensure associations are loaded
require('../models/index');

describe('Profile Data Management', () => {
    let testStudent, testAdmin;

    before(async () => {
        // Sync database once before all tests
        await sequelize.sync({ force: true });
    });

    after(async () => {
        // Close database connection after all tests
        await sequelize.close();
    });

    beforeEach(async () => {
        // Create unique test data
        const timestamp = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        testStudent = await User.create({
            name: 'Test Student',
            email: `student${timestamp}@test.com`,
            password: hashedPassword,
            role: 'student',
            is_approved: false
        });

        testAdmin = await User.create({
            name: 'Test Admin',
            email: `admin${timestamp}@test.com`,
            password: hashedPassword,
            role: 'admin',
            is_approved: true
        });
    });

    afterEach(async () => {
        // Cleanup
        if (testStudent) await testStudent.destroy().catch(() => {});
        if (testAdmin) await testAdmin.destroy().catch(() => {});
    });

    describe('Student Profile Updates', () => {
        it('should allow student to update their profile data', async () => {
            const updates = {
                phone_number: '555-123-4567',
                is_student_minor: false,
                user_profile_data: {
                    address: {
                        line_1: '123 Main St',
                        line_2: null,
                        city: 'Seattle',
                        state: 'WA',
                        zip: '98101'
                    }
                }
            };

            await testStudent.update(updates);
            await testStudent.reload();

            assert.strictEqual(testStudent.phone_number, '555-123-4567');
            assert.strictEqual(testStudent.is_student_minor, false);
            assert.strictEqual(testStudent.user_profile_data.address.line_1, '123 Main St');
            assert.strictEqual(testStudent.user_profile_data.address.city, 'Seattle');
        });

        it('should set profile_completed_at on first completion', async () => {
            assert.strictEqual(testStudent.profile_completed_at, null);

            const updates = {
                phone_number: '555-999-8888',
                is_student_minor: false,
                profile_completed_at: new Date(),
                user_profile_data: {
                    address: {
                        line_1: '456 Oak Ave',
                        line_2: null,
                        city: 'Portland',
                        state: 'OR',
                        zip: '97201'
                    }
                }
            };

            await testStudent.update(updates);
            await testStudent.reload();

            assert.ok(testStudent.profile_completed_at);
            assert.ok(testStudent.profile_completed_at instanceof Date);
        });

        it('should handle minor status with parent approval', async () => {
            const updates = {
                phone_number: '555-111-2222',
                is_student_minor: true,
                user_profile_data: {
                    parent_approval: true,
                    address: {
                        line_1: '789 Pine Rd',
                        city: 'Austin',
                        state: 'TX',
                        zip: '73301'
                    }
                }
            };

            await testStudent.update(updates);
            await testStudent.reload();

            assert.strictEqual(testStudent.is_student_minor, true);
            assert.strictEqual(testStudent.user_profile_data.parent_approval, true);
        });

        it('should handle optional address line 2', async () => {
            const updatesWithLine2 = {
                phone_number: '555-444-5555',
                is_student_minor: false,
                user_profile_data: {
                    address: {
                        line_1: '100 Broadway',
                        line_2: 'Apt 5B',
                        city: 'New York',
                        state: 'NY',
                        zip: '10001'
                    }
                }
            };

            await testStudent.update(updatesWithLine2);
            await testStudent.reload();

            assert.strictEqual(testStudent.user_profile_data.address.line_2, 'Apt 5B');
        });

        it('should persist complete profile data structure', async () => {
            const completeProfile = {
                name: 'Jane Doe',
                email: testStudent.email, // Keep same email
                phone_number: '555-777-8888',
                is_student_minor: false,
                user_profile_data: {
                    address: {
                        line_1: '200 Market St',
                        line_2: 'Floor 3',
                        city: 'San Francisco',
                        state: 'CA',
                        zip: '94102'
                    }
                }
            };

            await testStudent.update(completeProfile);
            await testStudent.reload();

            assert.strictEqual(testStudent.name, 'Jane Doe');
            assert.strictEqual(testStudent.phone_number, '555-777-8888');
            assert.strictEqual(testStudent.user_profile_data.address.line_1, '200 Market St');
            assert.strictEqual(testStudent.user_profile_data.address.line_2, 'Floor 3');
            assert.strictEqual(testStudent.user_profile_data.address.zip, '94102');
        });
    });

    describe('Admin Profile Editing', () => {
        it('should allow admin to update another user\'s profile', async () => {
            // Simulate admin editing student's profile
            const updates = {
                name: 'Updated Student Name',
                phone_number: '555-888-9999',
                is_student_minor: false,
                user_profile_data: {
                    address: {
                        line_1: '999 Admin Edit St',
                        line_2: null,
                        city: 'Boston',
                        state: 'MA',
                        zip: '02101'
                    }
                }
            };

            await User.updateUser(testStudent.id, updates);
            const updated = await User.findById(testStudent.id);

            assert.strictEqual(updated.name, 'Updated Student Name');
            assert.strictEqual(updated.phone_number, '555-888-9999');
            assert.strictEqual(updated.user_profile_data.address.line_1, '999 Admin Edit St');
        });

        it('should update profile_completed_at when profile becomes complete', async () => {
            // Start with incomplete profile
            assert.strictEqual(testStudent.profile_completed_at, null);

            // Admin completes the profile
            const updates = {
                phone_number: '555-222-3333',
                is_student_minor: false,
                profile_completed_at: new Date(),
                user_profile_data: {
                    address: {
                        line_1: '777 Complete Ave',
                        city: 'Miami',
                        state: 'FL',
                        zip: '33101'
                    }
                }
            };

            await User.updateUser(testStudent.id, updates);
            const updated = await User.findById(testStudent.id);

            assert.ok(updated.profile_completed_at);
        });

        it('should handle admin updating email and name together', async () => {
            const timestamp = Date.now();
            const updates = {
                name: 'New Full Name',
                email: `newemail${timestamp}@test.com`,
                phone_number: testStudent.phone_number || '555-000-0000'
            };

            await User.updateUser(testStudent.id, updates);
            const updated = await User.findById(testStudent.id);

            assert.strictEqual(updated.name, 'New Full Name');
            assert.strictEqual(updated.email, `newemail${timestamp}@test.com`);
        });

        it('should preserve existing data when updating only some fields', async () => {
            // Set initial profile
            await testStudent.update({
                phone_number: '555-111-1111',
                is_student_minor: false,
                user_profile_data: {
                    address: {
                        line_1: '100 Original St',
                        city: 'Denver',
                        state: 'CO',
                        zip: '80201'
                    }
                }
            });

            // Update only phone number
            await User.updateUser(testStudent.id, {
                phone_number: '555-222-2222'
            });

            const updated = await User.findById(testStudent.id);
            
            // Phone should be updated
            assert.strictEqual(updated.phone_number, '555-222-2222');
            // Address should be preserved
            assert.strictEqual(updated.user_profile_data.address.line_1, '100 Original St');
            assert.strictEqual(updated.is_student_minor, false);
        });
    });

    describe('Profile Completion Checks', () => {
        it('should detect incomplete profile', () => {
            const isComplete = User.isVerificationComplete(testStudent);
            assert.strictEqual(isComplete, false);
        });

        it('should detect complete profile', async () => {
            await testStudent.update({
                phone_number: '555-444-5555',
                is_student_minor: false,
                user_profile_data: {
                    address: {
                        line_1: '123 Complete St',
                        city: 'Seattle',
                        state: 'WA',
                        zip: '98101'
                    }
                }
            });

            await testStudent.reload();
            const isComplete = User.isVerificationComplete(testStudent);
            assert.strictEqual(isComplete, true);
        });

        it('should require parent approval for minors', async () => {
            await testStudent.update({
                phone_number: '555-666-7777',
                is_student_minor: true,
                user_profile_data: {
                    // Missing parent_approval
                    address: {
                        line_1: '456 Minor St',
                        city: 'Portland',
                        state: 'OR',
                        zip: '97201'
                    }
                }
            });

            await testStudent.reload();
            const isComplete = User.isVerificationComplete(testStudent);
            assert.strictEqual(isComplete, false);
        });

        it('should skip verification for admin users', () => {
            const isComplete = User.isVerificationComplete(testAdmin);
            assert.strictEqual(isComplete, true);
        });
    });
});

