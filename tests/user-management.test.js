const { describe, it, before, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert');
const { User } = require('../models/User');
const { Instructor } = require('../models/Instructor');
const { sequelize } = require('../db/index');

// Import models to ensure associations are loaded
require('../models/index');

describe('User Management', () => {
    let testUser;
    let testInstructor;

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
        
        // Create test user
        testUser = await User.create({
            name: 'Test User',
            email: `user${timestamp}@test.com`,
            password: '$2b$10$abcdefghijklmnopqrstuv',
            role: 'student',
            is_approved: false
        });
    });

    afterEach(async () => {
        // Cleanup
        if (testUser) await testUser.destroy().catch(() => {});
        if (testInstructor) await Instructor.destroy({ where: { user_id: testUser?.id } }).catch(() => {});
    });

    describe('User Creation', () => {
        it('should create a new student user', async () => {
            const timestamp = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
            const newUser = await User.create({
                name: 'New Student',
                email: `newstudent${timestamp}@test.com`,
                password: '$2b$10$abcdefghijklmnopqrstuv',
                role: 'student',
                is_approved: true
            });

            assert.ok(newUser.id);
            assert.strictEqual(newUser.name, 'New Student');
            assert.strictEqual(newUser.role, 'student');
            assert.strictEqual(newUser.is_approved, true);

            await newUser.destroy();
        });

        it('should create a new instructor user', async () => {
            const timestamp = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
            const newUser = await User.create({
                name: 'New Instructor',
                email: `newinstructor${timestamp}@test.com`,
                password: '$2b$10$abcdefghijklmnopqrstuv',
                role: 'instructor',
                is_approved: true
            });

            assert.ok(newUser.id);
            assert.strictEqual(newUser.role, 'instructor');

            await newUser.destroy();
        });
    });

    describe('User Updates', () => {
        it('should update user name and email', async () => {
            await testUser.update({
                name: 'Updated Name',
                email: `updated${Date.now()}@test.com`
            });

            await testUser.reload();
            assert.strictEqual(testUser.name, 'Updated Name');
        });

        it('should change user role from student to instructor', async () => {
            // Change role
            await testUser.update({ role: 'instructor' });
            
            // Create instructor profile (simulating what the API does)
            testInstructor = await Instructor.create({
                user_id: testUser.id,
                bio: '',
                specialties: '',
                hourly_rate: 0,
                is_active: true
            });

            await testUser.reload();
            assert.strictEqual(testUser.role, 'instructor');

            // Verify instructor profile was created
            const instructor = await Instructor.findOne({ where: { user_id: testUser.id } });
            assert.ok(instructor, 'Instructor profile should exist');
        });

        it('should change user role from instructor back to student without deleting instructor profile', async () => {
            // First make user an instructor
            await testUser.update({ role: 'instructor' });
            testInstructor = await Instructor.create({
                user_id: testUser.id,
                bio: 'Test bio',
                specialties: 'Test',
                hourly_rate: 50,
                is_active: true
            });

            const instructorId = testInstructor.id;

            // Change back to student
            await testUser.update({ role: 'student' });

            await testUser.reload();
            assert.strictEqual(testUser.role, 'student');

            // Verify instructor profile still exists (data integrity)
            const instructor = await Instructor.findByPk(instructorId);
            assert.ok(instructor, 'Instructor profile should not be deleted when role changes');
        });
    });

    describe('User Queries', () => {
        it('should find all users', async () => {
            const users = await User.findAll();
            assert.ok(Array.isArray(users));
            assert.ok(users.length > 0);
        });

        it('should include user role and approval status', async () => {
            const user = await User.findByPk(testUser.id);
            assert.ok(user.role !== undefined);
            assert.ok(user.is_approved !== undefined);
            assert.strictEqual(user.role, 'student');
        });
    });

    describe('User Approval Status', () => {
        it('should update user approval status to false', async () => {
            await testUser.update({ is_approved: false });
            await testUser.reload();
            assert.strictEqual(testUser.is_approved, false);
        });

        it('should update user approval status to true', async () => {
            await testUser.update({ is_approved: true });
            await testUser.reload();
            assert.strictEqual(testUser.is_approved, true);
        });
    });

    describe('User Deletion', () => {
        it('should delete a user', async () => {
            const userId = testUser.id;
            await testUser.destroy();

            // Verify user was deleted
            const user = await User.findByPk(userId);
            assert.strictEqual(user, null);
            
            // Prevent afterEach from trying to delete again
            testUser = null;
        });
    });
});

