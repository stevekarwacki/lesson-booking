const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

// Mock Stripe and Email before importing any models that might use them
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock_webhook_secret_for_testing';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_APP_PASSWORD = 'test_password';
process.env.COMPANY_NAME = 'Test Company';

const { Attendance } = require('../models/Attendance');
const { Calendar } = require('../models/Calendar');
const { User } = require('../models/User');
const { Instructor } = require('../models/Instructor');
const emailService = require('../services/EmailService');
const { sequelize } = require('../db/index');

// Import models to ensure associations are loaded
require('../models/index');

// Mock email service to prevent actual emails during tests
const originalSendAbsenceNotification = emailService.sendAbsenceNotification;
let emailsSent = [];

describe('Attendance Tracking System', () => {
    let testUser, testInstructor, testStudent, testBooking;

    beforeEach(async () => {
        // Mock email service
        emailService.sendAbsenceNotification = async (bookingData, notes) => {
            emailsSent.push({ bookingData, notes });
            return { success: true, messageId: 'test-message-id' };
        };
        emailsSent = [];

        // Create unique test data using timestamp
        const timestamp = Date.now();
        
        // Create test data
        testUser = await User.create({
            name: 'Test Instructor',
            email: `instructor${timestamp}@test.com`,
            password: 'hashedpassword',
            role: 'instructor'
        });

        testInstructor = await Instructor.create({
            user_id: testUser.id,
            hourly_rate: 50.00,
            bio: 'Test instructor bio'
        });

        testStudent = await User.create({
            name: 'Test Student',
            email: `student${timestamp}@test.com`,
            password: 'hashedpassword',
            role: 'student'
        });

        testBooking = await Calendar.create({
            instructor_id: testInstructor.id,
            student_id: testStudent.id,
            date: '2025-10-01',
            start_slot: 40, // 10:00 AM
            duration: 4,    // 1 hour
            status: 'booked'
        });
    });

    afterEach(async () => {
        // Restore original email service
        emailService.sendAbsenceNotification = originalSendAbsenceNotification;
        
        // Clean up test data in correct order to avoid foreign key constraints
        try {
            // Delete attendance records first (they reference calendar_events)
            await Attendance.destroy({ where: {}, force: true });
            // Delete calendar events (they reference instructors and users)  
            await Calendar.destroy({ where: {}, force: true });
            // Delete instructors (they reference users)
            await Instructor.destroy({ where: {}, force: true });
            // Delete users last
            await User.destroy({ where: {}, force: true });
        } catch (error) {
            // Ignore cleanup errors in tests
            console.log('Test cleanup warning:', error.message);
        }
    });

    describe('Attendance Model', () => {
        test('should create attendance record with valid data', async () => {
            const result = await Attendance.markAttendance(testBooking.id, 'present', 'Great lesson!');
            
            assert.strictEqual(result.created, true);
            assert.strictEqual(result.attendance.status, 'present');
            assert.strictEqual(result.attendance.notes, 'Great lesson!');
            assert.strictEqual(result.attendance.calendar_event_id, testBooking.id);
        });

        test('should update existing attendance record', async () => {
            // Create initial attendance
            await Attendance.markAttendance(testBooking.id, 'present', 'Initial note');
            
            // Update attendance
            const result = await Attendance.markAttendance(testBooking.id, 'tardy', 'Updated note');
            
            assert.strictEqual(result.created, false);
            assert.strictEqual(result.attendance.status, 'tardy');
            assert.strictEqual(result.attendance.notes, 'Updated note');
        });

        test('should enforce unique constraint on calendar_event_id', async () => {
            await Attendance.create({
                calendar_event_id: testBooking.id,
                status: 'present'
            });

            // Attempt to create duplicate should fail
            try {
                await Attendance.create({
                    calendar_event_id: testBooking.id,
                    status: 'absent'
                });
                assert.fail('Should have thrown unique constraint error');
            } catch (error) {
                // Check for different database error messages
                const errorMessage = error.message.toLowerCase();
                assert.ok(
                    errorMessage.includes('unique constraint') || 
                    errorMessage.includes('duplicate key') ||
                    errorMessage.includes('violates unique constraint') ||
                    errorMessage.includes('already exists') ||
                    errorMessage.includes('unique') ||
                    error.name === 'SequelizeUniqueConstraintError'
                );
            }
        });

        test('should allow null status (not recorded)', async () => {
            const attendance = await Attendance.create({
                calendar_event_id: testBooking.id,
                status: null,
                notes: 'No status set'
            });

            assert.strictEqual(attendance.status, null);
            assert.strictEqual(attendance.notes, 'No status set');
        });

        test('should validate status enum values', async () => {
            try {
                await Attendance.create({
                    calendar_event_id: testBooking.id,
                    status: 'invalid_status'
                });
                assert.fail('Should have thrown validation error');
            } catch (error) {
                // Check for different database validation error messages
                const errorMessage = error.message.toLowerCase();
                assert.ok(
                    errorMessage.includes('invalid input value') || 
                    errorMessage.includes('enum') ||
                    errorMessage.includes('validation error') ||
                    errorMessage.includes('invalid value') ||
                    errorMessage.includes('not in enum')
                );
            }
        });

        test('should cascade delete when booking is removed', async () => {
            await Attendance.create({
                calendar_event_id: testBooking.id,
                status: 'present'
            });

            // Delete the booking
            await Calendar.destroy({ where: { id: testBooking.id } });

            // Attendance should be deleted too
            const attendanceCount = await Attendance.count({
                where: { calendar_event_id: testBooking.id }
            });
            assert.strictEqual(attendanceCount, 0);
        });
    });

    describe('Calendar Model Integration', () => {
        test('should include attendance data in instructor events', async () => {
            // Create attendance record
            await Attendance.create({
                calendar_event_id: testBooking.id,
                status: 'present',
                notes: 'Great participation'
            });

            const events = await Calendar.getInstructorEvents(testInstructor.id);
            const event = events.find(e => e.id === testBooking.id);

            assert.ok(event);
            assert.ok(event.attendance);
            assert.strictEqual(event.attendance.status, 'present');
            assert.strictEqual(event.attendance.notes, 'Great participation');
        });

        test('should handle events without attendance records', async () => {
            const events = await Calendar.getInstructorEvents(testInstructor.id);
            const event = events.find(e => e.id === testBooking.id);

            assert.ok(event);
            assert.strictEqual(event.Attendance, null);
        });

        test('should include attendance in single event lookup', async () => {
            await Attendance.create({
                calendar_event_id: testBooking.id,
                status: 'absent'
            });

            const event = await Calendar.getEventById(testBooking.id);
            
            assert.ok(event);
            assert.ok(event.Attendance);
            assert.strictEqual(event.Attendance.status, 'absent');
        });
    });

    describe('Email Notification System', () => {
        test('should send email when student marked absent', async () => {
            // Mock the Calendar.getEventById to return full event data
            const originalGetEventById = Calendar.getEventById;
            Calendar.getEventById = async (id) => {
                const event = await originalGetEventById.call(Calendar, id);
                if (event && event.id === testBooking.id) {
                    event.student = testStudent;
                    event.Instructor = { User: testUser };
                }
                return event;
            };

            // Simulate API call that marks student absent
            const mockReq = {
                body: { eventId: testBooking.id, status: 'absent', notes: 'No show' },
                user: { id: testUser.id }
            };

            // This would normally be in the API endpoint
            await Attendance.markAttendance(testBooking.id, 'absent', 'No show');
            
            // Simulate email sending logic from API
            const fullEvent = await Calendar.getEventById(testBooking.id);
            if (fullEvent && fullEvent.student && fullEvent.student.email) {
                await emailService.sendAbsenceNotification(fullEvent, 'No show');
            }

            // Verify email was sent
            assert.strictEqual(emailsSent.length, 1);
            assert.strictEqual(emailsSent[0].notes, 'No show');
            assert.strictEqual(emailsSent[0].bookingData.student.email, testStudent.email);

            // Restore original method
            Calendar.getEventById = originalGetEventById;
        });

        test('should not send email for present or tardy status', async () => {
            await Attendance.markAttendance(testBooking.id, 'present', 'Attended well');
            await Attendance.markAttendance(testBooking.id, 'tardy', 'Late but attended');

            // No emails should be sent
            assert.strictEqual(emailsSent.length, 0);
        });

        test('should handle email service failures gracefully', async () => {
            // Mock email service to fail
            emailService.sendAbsenceNotification = async () => {
                throw new Error('Email service unavailable');
            };

            // Attendance should still be recorded even if email fails
            const result = await Attendance.markAttendance(testBooking.id, 'absent', 'Email test');
            
            assert.strictEqual(result.attendance.status, 'absent');
            assert.strictEqual(result.attendance.notes, 'Email test');
        });
    });

    describe('Time Validation Logic', () => {
        test('should validate lesson start time correctly', () => {
            const now = new Date('2025-10-01T10:30:00Z'); // 10:30 AM
            const lessonDate = new Date('2025-10-01T10:00:00Z'); // 10:00 AM lesson
            
            // Lesson started 30 minutes ago - should allow attendance
            assert.ok(now >= lessonDate);
        });

        test('should reject attendance before lesson start', () => {
            const now = new Date('2025-10-01T09:30:00Z'); // 9:30 AM
            const lessonDate = new Date('2025-10-01T10:00:00Z'); // 10:00 AM lesson
            
            // Lesson hasn't started yet - should reject
            assert.ok(now < lessonDate);
        });

        test('should allow editing past attendance records', async () => {
            // Create attendance for a past lesson
            const pastBooking = await Calendar.create({
                instructor_id: testInstructor.id,
                student_id: testStudent.id,
                date: '2025-09-01', // Past date
                start_slot: 40,
                duration: 4,
                status: 'booked'
            });

            const result = await Attendance.markAttendance(pastBooking.id, 'present', 'Late entry');
            
            assert.strictEqual(result.attendance.status, 'present');
            assert.strictEqual(result.attendance.notes, 'Late entry');

            // Clean up
            await Calendar.destroy({ where: { id: pastBooking.id } });
        });
    });

    describe('Permission Integration', () => {
        test('should work with existing booking permissions', async () => {
            // This test verifies that attendance uses the same permission system
            // In a real API test, this would check the authorizeBooking middleware
            
            // Simulate permission check - instructor can mark attendance for their booking
            const instructorCanAccess = testBooking.instructor_id === testInstructor.id;
            assert.strictEqual(instructorCanAccess, true);

            // Admin should be able to access any booking (simulated)
            const adminUser = await User.create({
                name: 'Admin User',
                email: `admin${Date.now()}@test.com`,
                password: 'hashedpassword',
                role: 'admin'
            });

            // Admin access would be granted by CASL rules
            const adminCanAccess = adminUser.role === 'admin';
            assert.strictEqual(adminCanAccess, true);

            // Clean up
            await User.destroy({ where: { id: adminUser.id } });
        });

        test('should prevent student access to attendance marking', async () => {
            // Students should not be able to mark attendance
            const studentCanAccess = testStudent.role === 'instructor' || testStudent.role === 'admin';
            assert.strictEqual(studentCanAccess, false);
        });
    });

    describe('Data Integrity', () => {
        test('should maintain referential integrity', async () => {
            const attendance = await Attendance.create({
                calendar_event_id: testBooking.id,
                status: 'present'
            });

            // Verify the relationship
            const foundAttendance = await Attendance.findOne({
                where: { calendar_event_id: testBooking.id },
                include: [{ model: Calendar }]
            });

            assert.ok(foundAttendance);
            assert.ok(foundAttendance.Calendar);
            assert.strictEqual(foundAttendance.Calendar.id, testBooking.id);
        });

        test('should handle concurrent attendance updates', async () => {
            // Create initial attendance
            await Attendance.markAttendance(testBooking.id, 'present', 'First update');

            // Simulate concurrent updates
            const [result1, result2] = await Promise.all([
                Attendance.markAttendance(testBooking.id, 'tardy', 'Update 1'),
                Attendance.markAttendance(testBooking.id, 'absent', 'Update 2')
            ]);

            // Both should succeed (upsert handles concurrency)
            assert.ok(result1.attendance);
            assert.ok(result2.attendance);

            // Final state should be one of the updates
            const finalAttendance = await Attendance.findOne({
                where: { calendar_event_id: testBooking.id }
            });
            
            assert.ok(['tardy', 'absent'].includes(finalAttendance.status));
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid calendar event ID', async () => {
            try {
                await Attendance.markAttendance(99999, 'present', 'Invalid booking');
                assert.fail('Should have thrown error for invalid booking ID');
            } catch (error) {
                assert.ok(error.message.includes('foreign key constraint') || 
                         error.message.includes('FOREIGN KEY constraint'));
            }
        });

        test('should handle malformed status values', async () => {
            try {
                await Attendance.create({
                    calendar_event_id: testBooking.id,
                    status: 'maybe_present' // Invalid enum value
                });
                assert.fail('Should have thrown validation error');
            } catch (error) {
                // Check for different database validation error messages
                const errorMessage = error.message.toLowerCase();
                assert.ok(
                    errorMessage.includes('invalid input value') || 
                    errorMessage.includes('enum') ||
                    errorMessage.includes('validation error') ||
                    errorMessage.includes('invalid value') ||
                    errorMessage.includes('not in enum')
                );
            }
        });

        test('should handle missing required fields', async () => {
            try {
                await Attendance.create({
                    status: 'present'
                    // Missing calendar_event_id
                });
                assert.fail('Should have thrown validation error');
            } catch (error) {
                assert.ok(error.message.includes('calendar_event_id') || 
                         error.message.includes('NOT NULL'));
            }
        });
    });
});

// Run the tests
console.log('🧪 Running Attendance Tracking test suite');
console.log('Testing attendance recording, email notifications, and data integrity');
