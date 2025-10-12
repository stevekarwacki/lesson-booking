const { test, describe } = require('node:test');
const assert = require('node:assert');

// Import the CASL abilities
const { defineAbilitiesFor } = require('../utils/abilities');
const { subject } = require('@casl/ability');

describe('Route Permission Tests - CASL Integration', () => {
    
    describe('Admin Route Permissions', () => {
        test('should allow admin to manage all resources', () => {
            const adminUser = { id: 1, role: 'admin' };
            const ability = defineAbilitiesFor(adminUser);
            
            // Admin should be able to manage everything
            assert.ok(ability.can('manage', 'all'));
            assert.ok(ability.can('read', 'User'));
            assert.ok(ability.can('create', 'User'));
            assert.ok(ability.can('update', 'User'));
            assert.ok(ability.can('delete', 'User'));
            assert.ok(ability.can('manage', 'Instructor'));
            assert.ok(ability.can('manage', 'Booking'));
        });

        test('should deny non-admin users from admin operations', () => {
            const instructorUser = { id: 2, role: 'instructor' };
            const studentUser = { id: 3, role: 'student' };
            
            const instructorAbility = defineAbilitiesFor(instructorUser);
            const studentAbility = defineAbilitiesFor(studentUser);
            
            // Instructors and students cannot manage all
            assert.ok(!instructorAbility.can('manage', 'all'));
            assert.ok(!studentAbility.can('manage', 'all'));
            
            // Cannot create/delete users
            assert.ok(!instructorAbility.can('create', 'User'));
            assert.ok(!instructorAbility.can('delete', 'User'));
            assert.ok(!studentAbility.can('create', 'User'));
            assert.ok(!studentAbility.can('delete', 'User'));
        });
    });

    describe('Calendar/Booking Route Permissions', () => {
        test('should allow students to book lessons', () => {
            const studentUser = { id: 3, role: 'student' };
            const ability = defineAbilitiesFor(studentUser);
            
            assert.ok(ability.can('create', 'Booking'));
        });

        test('should allow instructors to book lessons', () => {
            const instructorUser = { id: 2, role: 'instructor' };
            const ability = defineAbilitiesFor(instructorUser);
            
            // Instructors can book lessons for their own development
            assert.ok(ability.can('create', 'Booking'));
        });

        test('should allow students to update their own bookings', () => {
            const studentUser = { id: 3, role: 'student' };
            const ability = defineAbilitiesFor(studentUser);
            
            // Mock booking owned by the student (future date to avoid 24-hour policy)
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
            const ownBooking = { student_id: 3, date: futureDate.toISOString().split('T')[0], status: 'booked' };
            
            assert.ok(ability.can('update', subject('Booking', ownBooking)));
            assert.ok(ability.can('cancel', subject('Booking', ownBooking)));
        });

        test('should deny students from updating other student bookings', () => {
            const studentUser = { id: 3, role: 'student' };
            const ability = defineAbilitiesFor(studentUser);
            
            // Mock booking owned by another student (future date)
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
            const otherBooking = { student_id: 4, date: futureDate.toISOString().split('T')[0], status: 'booked' };
            
            assert.ok(!ability.can('update', subject('Booking', otherBooking)));
            assert.ok(!ability.can('cancel', subject('Booking', otherBooking)));
        });

        test('should allow instructors to manage student bookings', () => {
            const instructorUser = { id: 2, role: 'instructor', instructor_id: 2 };
            const ability = defineAbilitiesFor(instructorUser);
            
            // Mock booking with instructor (future date)
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
            const booking = { instructor_id: 2, student_id: 3, date: futureDate.toISOString().split('T')[0], status: 'booked' };
            
            assert.ok(ability.can('update', subject('Booking', booking)));
            assert.ok(ability.can('cancel', subject('Booking', booking)));
        });

        test('should enforce 24-hour policy for students', () => {
            const studentUser = { id: 3, role: 'student' };
            
            // Mock booking within 24 hours
            const now = new Date();
            const targetTime = new Date();
            if (now.getHours() < 14) {
                // If it's before 2 PM today, book for 2 PM today (definitely within 24 hours)
                targetTime.setHours(14, 0, 0, 0);
            } else {
                // If it's after 2 PM today, book for 10 AM tomorrow (definitely within 24 hours)
                targetTime.setDate(targetTime.getDate() + 1);
                targetTime.setHours(10, 0, 0, 0);
            }
            
            const nearBooking = { 
                student_id: 3, 
                date: targetTime.toISOString().split('T')[0], 
                start_slot: (targetTime.getHours() - 6) * 4, // Convert to slot (assuming 6 AM start)
                status: 'booked' 
            };
            
            // 24-hour policy is enforced in middleware via canBookingAction
            // CASL allows the basic permission, but middleware blocks it
            const ability = defineAbilitiesFor(studentUser);
            assert.ok(ability.can('update', subject('Booking', nearBooking))); // CASL allows
            assert.ok(ability.can('cancel', subject('Booking', nearBooking))); // CASL allows
            
            // But canBookingAction should block it due to 24-hour policy
            const { canBookingAction } = require('../utils/abilities');
            assert.ok(!canBookingAction(studentUser, nearBooking, 'update')); // Middleware blocks
            assert.ok(!canBookingAction(studentUser, nearBooking, 'cancel')); // Middleware blocks
        });

        test('should allow admin/instructor to bypass 24-hour policy', () => {
            const adminUser = { id: 1, role: 'admin' };
            const instructorUser = { id: 2, role: 'instructor', instructor_id: 2 };
            
            const adminAbility = defineAbilitiesFor(adminUser);
            const instructorAbility = defineAbilitiesFor(instructorUser);
            
            // Mock booking within 24 hours
            const now = new Date();
            const targetTime = new Date();
            if (now.getHours() < 14) {
                // If it's before 2 PM today, book for 2 PM today (definitely within 24 hours)
                targetTime.setHours(14, 0, 0, 0);
            } else {
                // If it's after 2 PM today, book for 10 AM tomorrow (definitely within 24 hours)
                targetTime.setDate(targetTime.getDate() + 1);
                targetTime.setHours(10, 0, 0, 0);
            }
            
            const nearBooking = { 
                instructor_id: 2,
                student_id: 3, 
                date: targetTime.toISOString().split('T')[0], 
                start_slot: (targetTime.getHours() - 6) * 4, // Convert to slot (assuming 6 AM start)
                status: 'booked' 
            };
            
            // Admin and instructor can bypass 24-hour policy
            assert.ok(adminAbility.can('update', subject('Booking', nearBooking)));
            assert.ok(instructorAbility.can('update', subject('Booking', nearBooking)));
        });
    });

    describe('Instructor Route Permissions', () => {
        test('should allow admin to manage instructors', () => {
            const adminUser = { id: 1, role: 'admin' };
            const ability = defineAbilitiesFor(adminUser);
            
            assert.ok(ability.can('create', 'Instructor'));
            assert.ok(ability.can('update', 'Instructor'));
            assert.ok(ability.can('delete', 'Instructor'));
        });

        test('should allow instructor to read their own profile', () => {
            const instructorUser = { id: 2, role: 'instructor' };
            const ability = defineAbilitiesFor(instructorUser);
            
            // Mock instructor resource
            const ownInstructor = { user_id: 2 };
            
            assert.ok(ability.can('read', subject('Instructor', ownInstructor)));
        });

        test('should deny instructor from reading other instructor profiles', () => {
            const instructorUser = { id: 2, role: 'instructor' };
            const ability = defineAbilitiesFor(instructorUser);
            
            // Mock other instructor resource
            const otherInstructor = { user_id: 5 };
            
            assert.ok(!ability.can('read', subject('Instructor', otherInstructor)));
        });

        test('should allow instructor to update their own profile but not create instructors', () => {
            const instructorUser = { id: 2, role: 'instructor' };
            const studentUser = { id: 3, role: 'student' };
            
            const instructorAbility = defineAbilitiesFor(instructorUser);
            const studentAbility = defineAbilitiesFor(studentUser);
            
            // Instructors can update their own profile but not create new instructors
            assert.ok(!instructorAbility.can('create', 'Instructor'));
            assert.ok(instructorAbility.can('update', subject('Instructor', { user_id: 2 })));
            
            // Students cannot create or update instructors
            assert.ok(!studentAbility.can('create', 'Instructor'));
            assert.ok(!studentAbility.can('update', 'Instructor'));
        });
    });

    describe('User Route Permissions', () => {
        test('should allow users to update their own profile', () => {
            const studentUser = { id: 3, role: 'student' };
            const ability = defineAbilitiesFor(studentUser);
            
            // Mock user accessing their own profile
            const ownUser = { id: 3 };
            
            assert.ok(ability.can('update', subject('User', ownUser)));
        });

        test('should deny users from updating other profiles', () => {
            const studentUser = { id: 3, role: 'student' };
            const ability = defineAbilitiesFor(studentUser);
            
            // Mock other user's profile
            const otherUser = { id: 4 };
            
            assert.ok(!ability.can('update', subject('User', otherUser)));
        });

        test('should allow admin to approve users', () => {
            const adminUser = { id: 1, role: 'admin' };
            const ability = defineAbilitiesFor(adminUser);
            
            assert.ok(ability.can('manage', 'User'));
        });

        test('should deny non-admin from approving users', () => {
            const instructorUser = { id: 2, role: 'instructor' };
            const studentUser = { id: 3, role: 'student' };
            
            const instructorAbility = defineAbilitiesFor(instructorUser);
            const studentAbility = defineAbilitiesFor(studentUser);
            
            assert.ok(!instructorAbility.can('manage', 'User'));
            assert.ok(!studentAbility.can('manage', 'User'));
        });
    });

    describe('Instructor Availability Route Permissions', () => {
        test('should allow instructor to manage their own availability', () => {
            const instructorUser = { id: 2, role: 'instructor' };
            const ability = defineAbilitiesFor(instructorUser);
            
            assert.ok(ability.can('update', 'InstructorAvailability'));
        });

        test('should allow admin to manage all instructor availability', () => {
            const adminUser = { id: 1, role: 'admin' };
            const ability = defineAbilitiesFor(adminUser);
            
            assert.ok(ability.can('update', 'InstructorAvailability'));
        });

        test('should deny student from managing availability', () => {
            const studentUser = { id: 3, role: 'student' };
            const ability = defineAbilitiesFor(studentUser);
            
            assert.ok(!ability.can('update', 'InstructorAvailability'));
        });

        test('should allow instructor to delete their own blocked times', () => {
            const instructorUser = { id: 2, role: 'instructor', instructor_id: 2 };
            const ability = defineAbilitiesFor(instructorUser);
            
            // Mock blocked time belonging to instructor
            const ownBlockedTime = { instructor_id: 2 };
            
            assert.ok(ability.can('delete', subject('InstructorAvailability', ownBlockedTime)));
        });

        test('should deny instructor from deleting other instructor blocked times', () => {
            const instructorUser = { id: 2, role: 'instructor' };
            const ability = defineAbilitiesFor(instructorUser);
            
            // Mock blocked time belonging to other instructor
            const otherBlockedTime = { instructor_id: 5 };
            
            assert.ok(!ability.can('delete', subject('InstructorAvailability', otherBlockedTime)));
        });
    });

    describe('Payment Route Permissions', () => {
        test('should allow authenticated users to access payment features', () => {
            const studentUser = { id: 3, role: 'student' };
            const instructorUser = { id: 2, role: 'instructor' };
            const adminUser = { id: 1, role: 'admin' };
            
            const studentAbility = defineAbilitiesFor(studentUser);
            const instructorAbility = defineAbilitiesFor(instructorUser);
            const adminAbility = defineAbilitiesFor(adminUser);
            
            // All authenticated users can access payment features
            assert.ok(studentAbility.can('read', 'Credits'));
            assert.ok(studentAbility.can('create', 'Purchase'));
            assert.ok(studentAbility.can('read', 'Transaction'));
            
            // Instructors should NOT have payment permissions
            assert.ok(!instructorAbility.can('read', 'Credits'));
            assert.ok(!instructorAbility.can('create', 'Purchase'));
            assert.ok(!instructorAbility.can('read', 'Transaction'));
            
            assert.ok(adminAbility.can('read', 'Credits'));
            assert.ok(adminAbility.can('create', 'Purchase'));
            assert.ok(adminAbility.can('read', 'Transaction'));
        });
    });

    describe('Subscription Route Permissions', () => {
        test('should allow students to manage their own subscriptions', () => {
            const studentUser = { id: 1, role: 'student' };
            const ability = defineAbilitiesFor(studentUser);
            
            // Students can purchase subscriptions
            assert.ok(ability.can('purchase', 'Subscription'));
            
            // Students can read their own subscriptions
            const ownSubscription = { user_id: 1, status: 'active' };
            assert.ok(ability.can('read', subject('Subscription', ownSubscription)));
            
            // Students can cancel their own subscriptions
            assert.ok(ability.can('cancel', subject('Subscription', ownSubscription)));
            
            // Students cannot read other users' subscriptions
            const otherSubscription = { user_id: 2, status: 'active' };
            assert.ok(!ability.can('read', subject('Subscription', otherSubscription)));
            assert.ok(!ability.can('cancel', subject('Subscription', otherSubscription)));
        });

        test('should allow instructors to manage their own subscriptions', () => {
            const instructorUser = { id: 2, role: 'instructor' };
            const ability = defineAbilitiesFor(instructorUser);
            
            // Instructors can purchase subscriptions
            assert.ok(ability.can('purchase', 'Subscription'));
            
            // Instructors can read their own subscriptions
            const ownSubscription = { user_id: 2, status: 'active' };
            assert.ok(ability.can('read', subject('Subscription', ownSubscription)));
            
            // Instructors can cancel their own subscriptions
            assert.ok(ability.can('cancel', subject('Subscription', ownSubscription)));
            
            // Instructors cannot read other users' subscriptions
            const otherSubscription = { user_id: 1, status: 'active' };
            assert.ok(!ability.can('read', subject('Subscription', otherSubscription)));
            assert.ok(!ability.can('cancel', subject('Subscription', otherSubscription)));
        });

        test('should allow admin to manage all subscriptions', () => {
            const adminUser = { id: 1, role: 'admin' };
            const ability = defineAbilitiesFor(adminUser);
            
            // Admin can manage all subscriptions
            assert.ok(ability.can('manage', 'all'));
            
            // Admin can access any subscription
            const subscription1 = { user_id: 1, status: 'active' };
            const subscription2 = { user_id: 2, status: 'cancelled' };
            
            assert.ok(ability.can('read', subject('Subscription', subscription1)));
            assert.ok(ability.can('cancel', subject('Subscription', subscription1)));
            assert.ok(ability.can('read', subject('Subscription', subscription2)));
            assert.ok(ability.can('cancel', subject('Subscription', subscription2)));
        });
    });

    describe('Recurring Booking Route Permissions', () => {
        test('should allow students to manage recurring bookings through subscription ownership', () => {
            const studentUser = { id: 1, role: 'student' };
            const ability = defineAbilitiesFor(studentUser);
            
            // Students can create recurring bookings
            assert.ok(ability.can('create', 'RecurringBooking'));
            
            // Students can manage recurring bookings linked to their subscriptions
            const ownRecurringBooking = { user_id: 1, instructor_id: 2 };
            assert.ok(ability.can('read', subject('RecurringBooking', ownRecurringBooking)));
            assert.ok(ability.can('update', subject('RecurringBooking', ownRecurringBooking)));
            assert.ok(ability.can('delete', subject('RecurringBooking', ownRecurringBooking)));
            
            // Students cannot manage recurring bookings of other users
            const otherRecurringBooking = { user_id: 2, instructor_id: 2 };
            assert.ok(!ability.can('read', subject('RecurringBooking', otherRecurringBooking)));
            assert.ok(!ability.can('update', subject('RecurringBooking', otherRecurringBooking)));
            assert.ok(!ability.can('delete', subject('RecurringBooking', otherRecurringBooking)));
        });

        test('should allow instructors to manage their own recurring bookings', () => {
            const instructorUser = { id: 2, role: 'instructor', instructor_id: 2 };
            const ability = defineAbilitiesFor(instructorUser);
            
            // Instructors can create recurring bookings
            assert.ok(ability.can('create', 'RecurringBooking'));
            
            // Instructors can manage recurring bookings where they are the instructor
            const ownRecurringBooking = { user_id: 1, instructor_id: 2 };
            assert.ok(ability.can('read', subject('RecurringBooking', ownRecurringBooking)));
            assert.ok(ability.can('update', subject('RecurringBooking', ownRecurringBooking)));
            assert.ok(ability.can('delete', subject('RecurringBooking', ownRecurringBooking)));
            
            // Instructors cannot manage recurring bookings of other instructors
            const otherRecurringBooking = { user_id: 1, instructor_id: 3 };
            assert.ok(!ability.can('read', subject('RecurringBooking', otherRecurringBooking)));
            assert.ok(!ability.can('update', subject('RecurringBooking', otherRecurringBooking)));
            assert.ok(!ability.can('delete', subject('RecurringBooking', otherRecurringBooking)));
        });

        test('should allow admin to manage all recurring bookings', () => {
            const adminUser = { id: 1, role: 'admin' };
            const ability = defineAbilitiesFor(adminUser);
            
            // Admin can manage all recurring bookings
            assert.ok(ability.can('manage', 'all'));
            
            // Admin can access any recurring booking
            const recurringBooking1 = { user_id: 1, instructor_id: 2 };
            const recurringBooking2 = { user_id: 3, instructor_id: 4 };
            
            assert.ok(ability.can('read', subject('RecurringBooking', recurringBooking1)));
            assert.ok(ability.can('update', subject('RecurringBooking', recurringBooking1)));
            assert.ok(ability.can('delete', subject('RecurringBooking', recurringBooking1)));
            assert.ok(ability.can('read', subject('RecurringBooking', recurringBooking2)));
            assert.ok(ability.can('update', subject('RecurringBooking', recurringBooking2)));
            assert.ok(ability.can('delete', subject('RecurringBooking', recurringBooking2)));
        });

        test('should validate recurring booking access through subscription ownership', () => {
            const studentUser = { id: 1, role: 'student' };
            const instructorUser = { id: 2, role: 'instructor', instructor_id: 2 };
            
            const studentAbility = defineAbilitiesFor(studentUser);
            const instructorAbility = defineAbilitiesFor(instructorUser);
            
            // Recurring booking where student owns subscription and instructor teaches
            const recurringBooking = { user_id: 1, instructor_id: 2 };
            
            // Student should be able to manage (via subscription ownership)
            assert.ok(studentAbility.can('read', subject('RecurringBooking', recurringBooking)));
            assert.ok(studentAbility.can('update', subject('RecurringBooking', recurringBooking)));
            assert.ok(studentAbility.can('delete', subject('RecurringBooking', recurringBooking)));
            
            // Instructor should be able to manage (via instructor_id)
            assert.ok(instructorAbility.can('read', subject('RecurringBooking', recurringBooking)));
            assert.ok(instructorAbility.can('update', subject('RecurringBooking', recurringBooking)));
            assert.ok(instructorAbility.can('delete', subject('RecurringBooking', recurringBooking)));
        });
    });

    describe('Cross-Role Permission Verification', () => {
        test('should verify complete permission matrix', () => {
            const roles = [
                { user: { id: 1, role: 'admin' }, name: 'Admin' },
                { user: { id: 2, role: 'instructor' }, name: 'Instructor' },
                { user: { id: 3, role: 'student' }, name: 'Student' }
            ];

            const permissions = [
                { action: 'manage', subject: 'all', expectedRoles: ['admin'] },
                { action: 'create', subject: 'Booking', expectedRoles: ['admin', 'instructor', 'student'] },
                { action: 'update', subject: 'InstructorAvailability', expectedRoles: ['admin', 'instructor'] },
                { action: 'create', subject: 'Instructor', expectedRoles: ['admin'] },
                { action: 'read', subject: 'Credits', expectedRoles: ['admin', 'student'] },
                { action: 'purchase', subject: 'Subscription', expectedRoles: ['admin', 'instructor', 'student'] },
                { action: 'create', subject: 'RecurringBooking', expectedRoles: ['admin', 'instructor', 'student'] }
            ];

            for (const permission of permissions) {
                for (const role of roles) {
                    const ability = defineAbilitiesFor(role.user);
                    const canPerform = ability.can(permission.action, permission.subject);
                    const shouldAllow = permission.expectedRoles.includes(role.user.role);
                    
                    assert.equal(
                        canPerform, 
                        shouldAllow,
                        `${role.name} should ${shouldAllow ? '' : 'NOT '}be able to ${permission.action} ${permission.subject}`
                    );
                }
            }
        });
    });

    describe('Edge Cases and Security', () => {
        test('should handle undefined user gracefully', () => {
            const ability = defineAbilitiesFor(undefined);
            
            // Undefined user should have no permissions
            assert.ok(!ability.can('read', 'User'));
            assert.ok(!ability.can('create', 'Booking'));
            assert.ok(!ability.can('manage', 'all'));
        });

        test('should handle user without role', () => {
            const userWithoutRole = { id: 1 };
            const ability = defineAbilitiesFor(userWithoutRole);
            
            // User without role should have basic auth permissions but not action permissions  
            assert.ok(ability.can('read', subject('User', { id: 1 }))); // Can read own profile
            assert.ok(!ability.can('create', 'Booking')); // Cannot book lessons
        });

        test('should handle invalid role', () => {
            const userWithInvalidRole = { id: 1, role: 'invalid' };
            const ability = defineAbilitiesFor(userWithInvalidRole);
            
            // Invalid role should have basic auth permissions but not specific role permissions
            assert.ok(ability.can('read', subject('User', { id: 1 }))); // Can read own profile
            assert.ok(!ability.can('create', 'Booking')); // Cannot book lessons
        });

        test('should enforce resource ownership correctly', () => {
            const user1 = { id: 1, role: 'student' };
            const user2 = { id: 2, role: 'student' };
            
            const ability1 = defineAbilitiesFor(user1);
            const ability2 = defineAbilitiesFor(user2);
            
            // Use future dates to avoid 24-hour policy blocking the test
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
            const futureDateStr = futureDate.toISOString().split('T')[0];
            
            const resource1 = { student_id: 1, date: futureDateStr, status: 'booked' };
            const resource2 = { student_id: 2, date: futureDateStr, status: 'booked' };
            
            // User 1 can access their resource, but not user 2's
            assert.ok(ability1.can('update', subject('Booking', resource1)));
            assert.ok(!ability1.can('update', subject('Booking', resource2)));
            
            // User 2 can access their resource, but not user 1's
            assert.ok(ability2.can('update', subject('Booking', resource2)));
            assert.ok(!ability2.can('update', subject('Booking', resource1)));
        });
    });
});
