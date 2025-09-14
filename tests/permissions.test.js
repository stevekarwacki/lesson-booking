const { test, describe } = require('node:test');
const assert = require('node:assert');
const { defineAbilitiesFor, can, canBookingAction } = require('../utils/abilities');

describe('CASL Permissions Infrastructure Tests', () => {
  
  // Test user fixtures
  const adminUser = { id: 1, role: 'admin' };
  const instructorUser = { id: 2, role: 'instructor', instructor_id: 10 };
  const studentUser = { id: 3, role: 'student' };
  const unapprovedStudentUser = { id: 4, role: 'student', is_approved: false };

  // Test booking fixtures
  const studentBooking = {
    id: 1,
    student_id: 3,
    instructor_id: 10,
    date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0], // 48 hours from now
    status: 'booked'
  };

  const pastBooking = {
    id: 2,
    student_id: 3,
    instructor_id: 10,
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 24 hours ago
    status: 'completed'
  };

  const nearFutureBooking = {
    id: 3,
    student_id: 3,
    instructor_id: 10,
    date: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 hours from now
    status: 'booked'
  };

  describe('Admin Permissions', () => {
    test('Admin can manage everything', () => {
      const ability = defineAbilitiesFor(adminUser);
      
      assert.strictEqual(ability.can('manage', 'all'), true);
      assert.strictEqual(ability.can('create', 'User'), true);
      assert.strictEqual(ability.can('delete', 'Booking'), true);
      assert.strictEqual(ability.can('manage', 'Package'), true);
    });

    test('Admin can access any user data', () => {
      assert.strictEqual(can(adminUser, 'read', 'User', { id: 999 }), true);
      assert.strictEqual(can(adminUser, 'update', 'User', { id: 999 }), true);
    });

    test('Admin can edit any booking including past ones', () => {
      assert.strictEqual(canBookingAction(adminUser, pastBooking, 'update'), true);
      assert.strictEqual(canBookingAction(adminUser, nearFutureBooking, 'update'), true);
    });
  });

  describe('Instructor Permissions', () => {
    test('Instructor can manage their own bookings', () => {
      const instructorBooking = { ...studentBooking, instructor_id: 10 };
      const otherInstructorBooking = { ...studentBooking, instructor_id: 20 };

      assert.strictEqual(can(instructorUser, 'read', 'Booking', instructorBooking), true);
      assert.strictEqual(can(instructorUser, 'update', 'Booking', instructorBooking), true);
      assert.strictEqual(can(instructorUser, 'read', 'Booking', otherInstructorBooking), false);
    });

    test('Instructor can manage their own profile', () => {
      const ownProfile = { user_id: 2 };
      const otherProfile = { user_id: 3 };

      assert.strictEqual(can(instructorUser, 'update', 'Instructor', ownProfile), true);
      assert.strictEqual(can(instructorUser, 'update', 'Instructor', otherProfile), false);
    });

    test('Instructor can manage their availability', () => {
      const ownAvailability = { instructor_id: 10 };
      const otherAvailability = { instructor_id: 20 };

      assert.strictEqual(can(instructorUser, 'manage', 'Availability', ownAvailability), true);
      assert.strictEqual(can(instructorUser, 'manage', 'Availability', otherAvailability), false);
    });

    test('Instructor can edit past bookings with their students', () => {
      const instructorPastBooking = { ...pastBooking, instructor_id: 10 };
      assert.strictEqual(canBookingAction(instructorUser, instructorPastBooking, 'update'), true);
    });
  });

  describe('Student Permissions', () => {
    test('Student can manage their own bookings with time restrictions', () => {
      const ownBooking = { ...studentBooking, student_id: 3 };
      const otherBooking = { ...studentBooking, student_id: 4 };

      assert.strictEqual(can(studentUser, 'read', 'Booking', ownBooking), true);
      assert.strictEqual(can(studentUser, 'update', 'Booking', ownBooking), true);
      assert.strictEqual(can(studentUser, 'read', 'Booking', otherBooking), false);
    });

    test('Student cannot edit bookings within 24 hours', () => {
      const ownNearBooking = { ...nearFutureBooking, student_id: 3 };
      const ownFarBooking = { ...studentBooking, student_id: 3 };

      assert.strictEqual(canBookingAction(studentUser, ownNearBooking, 'update'), false);
      assert.strictEqual(canBookingAction(studentUser, ownFarBooking, 'update'), true);
    });

    test('Student cannot edit past or cancelled bookings', () => {
      const ownPastBooking = { ...pastBooking, student_id: 3 };
      const ownCancelledBooking = { ...studentBooking, student_id: 3, status: 'cancelled' };

      assert.strictEqual(can(studentUser, 'update', 'Booking', ownPastBooking), false);
      assert.strictEqual(can(studentUser, 'update', 'Booking', ownCancelledBooking), false);
    });

    test('Student can only read active instructors', () => {
      const activeInstructor = { is_active: true };
      const inactiveInstructor = { is_active: false };

      assert.strictEqual(can(studentUser, 'read', 'Instructor', activeInstructor), true);
      assert.strictEqual(can(studentUser, 'read', 'Instructor', inactiveInstructor), false);
    });

    test('Student can manage their own subscriptions', () => {
      const ownSubscription = { user_id: 3 };
      const otherSubscription = { user_id: 4 };

      assert.strictEqual(can(studentUser, 'read', 'Subscription', ownSubscription), true);
      assert.strictEqual(can(studentUser, 'cancel', 'Subscription', ownSubscription), true);
      assert.strictEqual(can(studentUser, 'read', 'Subscription', otherSubscription), false);
    });
  });

  describe('Anonymous User Permissions', () => {
    test('Anonymous user has no permissions', () => {
      const ability = defineAbilitiesFor(null);
      
      assert.strictEqual(ability.can('read', 'User'), false);
      assert.strictEqual(ability.can('create', 'Booking'), false);
      assert.strictEqual(ability.can('read', 'Instructor'), false);
    });
  });

  describe('Time-based Restrictions', () => {
    test('24-hour booking modification policy', () => {
      // Create bookings at different time intervals  
      const now = new Date();
      
      // Create a booking definitely more than 24 hours away (48 hours)
      const farFuture = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      // Create a booking less than 24 hours away (12 hours)
      const nearFuture = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      
      const booking25Hours = {
        ...studentBooking,
        student_id: 3,
        date: farFuture.toISOString().split('T')[0]
      };
      
      const booking23Hours = {
        ...studentBooking,
        student_id: 3,
        date: nearFuture.toISOString().split('T')[0]
      };

      assert.strictEqual(canBookingAction(studentUser, booking25Hours, 'update'), true);
      assert.strictEqual(canBookingAction(studentUser, booking23Hours, 'update'), false);
      assert.strictEqual(canBookingAction(studentUser, booking25Hours, 'cancel'), true);
      assert.strictEqual(canBookingAction(studentUser, booking23Hours, 'cancel'), false);
    });

    test('Instructors and admins are not subject to 24-hour restriction', () => {
      const booking1Hour = {
        ...studentBooking,
        instructor_id: 10,
        date: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      assert.strictEqual(canBookingAction(instructorUser, booking1Hour, 'update'), true);
      assert.strictEqual(canBookingAction(adminUser, booking1Hour, 'update'), true);
    });
  });

  describe('Resource Ownership', () => {
    test('Users can only access their own profile data', () => {
      const ownProfile = { id: 3 };
      const otherProfile = { id: 4 };

      assert.strictEqual(can(studentUser, 'read', 'User', ownProfile), true);
      assert.strictEqual(can(studentUser, 'update', 'User', ownProfile), true);
      assert.strictEqual(can(studentUser, 'read', 'User', otherProfile), false);
      assert.strictEqual(can(studentUser, 'update', 'User', otherProfile), false);
    });

    test('Instructors can only manage their own instructor profile', () => {
      const ownInstructorProfile = { user_id: 2 };
      const otherInstructorProfile = { user_id: 5 };

      assert.strictEqual(can(instructorUser, 'update', 'Instructor', ownInstructorProfile), true);
      assert.strictEqual(can(instructorUser, 'update', 'Instructor', otherInstructorProfile), false);
    });
  });

  describe('Helper Functions', () => {
    test('can() helper function works correctly', () => {
      assert.strictEqual(can(adminUser, 'manage', 'all'), true);
      assert.strictEqual(can(studentUser, 'create', 'Booking'), true);
      assert.strictEqual(can(studentUser, 'manage', 'User'), false);
      assert.strictEqual(can(null, 'read', 'User'), false);
    });

    test('canBookingAction() includes time validation', () => {
      const recentBooking = {
        ...studentBooking,
        student_id: 3,
        date: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 hour from now
      };

      // Student should be blocked by time restriction
      assert.strictEqual(canBookingAction(studentUser, recentBooking, 'update'), false);
      
      // Admin should not be blocked
      assert.strictEqual(canBookingAction(adminUser, recentBooking, 'update'), true);
    });
  });
});

// Run the tests if this file is executed directly
if (require.main === module) {
  console.log('Running CASL permissions tests...');
}
