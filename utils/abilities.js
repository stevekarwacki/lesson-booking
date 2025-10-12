const { defineAbility, subject } = require('@casl/ability');
const { fromString, createDateHelper } = require('./dateHelpers');

/**
 * Check if a booking is within 24 hours (for student restrictions)
 * @param {Object} booking - Booking object with date and start_slot properties
 * @returns {boolean} - True if booking is within 24 hours
 */
function isWithin24Hours(booking) {
  if (!booking || !booking.date) return false;
  
  // Create booking datetime using date helpers
  const bookingHelper = fromString(booking.date);
  
  // Add the slot time to get the actual booking time
  if (booking.start_slot !== undefined) {
    const hours = Math.floor(booking.start_slot / 4);
    const minutes = (booking.start_slot % 4) * 15;
    const bookingDateTime = bookingHelper.addHours(hours).addMinutes(minutes);
    
    // Use the new business logic helper
    return bookingDateTime.isWithinCancellationWindow(24);
  }
  
  return false;
}

/**
 * Define abilities for a user based on their role and context
 * @param {Object} user - User object with role and other properties
 * @returns {Ability} CASL ability instance
 */
const defineAbilitiesFor = (user) => {
  return defineAbility((can, cannot) => {
    if (!user) {
      // Anonymous users have no permissions
      return;
    }

    // Base permissions for all authenticated users
    can('read', 'User', { id: user.id }); // Own profile
    can('update', 'User', { id: user.id }); // Own profile

    // Student permissions
    if (user.role === 'student') {
      // Booking permissions
      can('create', 'Booking');
      can('create', 'StudentBooking');
      can('read', 'Booking', { student_id: user.id });
      
      // Students can update/cancel only their own bookings that are 'booked' status
      // Note: 24-hour time restriction is enforced in middleware via canBookingAction
      can('update', 'Booking', { student_id: user.id, status: 'booked' });
      can('cancel', 'Booking', { student_id: user.id });
      
      // Students can read active instructors
      can('read', 'Instructor', { is_active: true });
      
      // User profile editing - students can edit their own profile but not change their role
      can('edit', 'UserProfile', { id: user.id });
      cannot('edit', 'UserRole', { id: user.id }); // Cannot change their own role
      
      // Payment system permissions for students
      can('read', 'Credits');
      can('create', 'Purchase');
      can('read', 'Transaction');
      can('access', 'StudentPayments');
      
      // Package and subscription permissions
      can('purchase', 'Package');
      can('purchase', 'Subscription');
      can('read', 'Subscription', { user_id: user.id });
      can('cancel', 'Subscription', { user_id: user.id });
      
      // Recurring booking permissions (students can manage through their subscriptions)
      can('create', 'RecurringBooking');
      can('read', 'RecurringBooking', { user_id: user.id });  // Via subscription ownership
      can('update', 'RecurringBooking', { user_id: user.id }); // Via subscription ownership  
      can('delete', 'RecurringBooking', { user_id: user.id }); // Via subscription ownership
      
      // Students cannot edit past bookings or bookings within 24 hours
      // (Time-based restrictions handled in middleware/components)
      cannot('update', 'Booking', { status: 'completed' });
      cannot('update', 'Booking', { status: 'cancelled' });
    }

    // Instructor permissions
    if (user.role === 'instructor') {
      // Inherit some student permissions for their own bookings
      can('create', 'Booking');
      can('read', 'Booking', { student_id: user.id });
      
      // Instructor-specific booking permissions
      can('read', 'Booking', { instructor_id: user.instructor_id });
      can('update', 'Booking', { instructor_id: user.instructor_id });
      can('cancel', 'Booking', { instructor_id: user.instructor_id });
      can('manage', 'Booking', { instructor_id: user.instructor_id }); // Including past bookings
      
      // Instructor profile management
      can('read', 'Instructor', { user_id: user.id });
      can('update', 'Instructor', { user_id: user.id });
      
      // User profile editing - instructors can edit their own profile but not change their role
      can('edit', 'UserProfile', { id: user.id });
      cannot('edit', 'UserRole', { id: user.id }); // Cannot change their own role
      
      // Availability management (own only)
      can('manage', 'Availability', { instructor_id: user.instructor_id });
      can('manage', 'OwnInstructorAvailability');
      can('update', 'InstructorAvailability');
      can('delete', 'InstructorAvailability', { instructor_id: user.instructor_id });
      
      // Subscription permissions (instructors can view their own subscriptions)
      can('purchase', 'Subscription');
      can('read', 'Subscription', { user_id: user.id });
      can('cancel', 'Subscription', { user_id: user.id });
      
      // Recurring booking permissions
      can('create', 'RecurringBooking');
      can('read', 'RecurringBooking', { instructor_id: user.instructor_id });
      can('update', 'RecurringBooking', { instructor_id: user.instructor_id });
      can('delete', 'RecurringBooking', { instructor_id: user.instructor_id });
      
      // Read students who have bookings with them
      can('read', 'Student'); // Will be filtered by booking relationship in routes
      
      // Refund permissions - instructors can refund bookings for their students
      can('refund', 'Booking', { instructor_id: user.instructor_id });
      
      // Calendar and schedule management (instructor-specific)
      can('manage', 'Calendar', { instructor_id: user.instructor_id });
      can('manage', 'OwnInstructorCalendar');
      can('read', 'Calendar', { instructor_id: user.instructor_id });
    }

    // Admin permissions
    if (user.role === 'admin') {
      // Admins can do everything except role-specific actions
      can('manage', 'all');
      
      // Explicit permissions for clarity
      can('manage', 'AllInstructorAvailability');
      
      // Refund permissions - admins can refund any booking
      can('refund', 'Booking');
      
      // User role management permissions
      can('edit', 'UserRole'); // Can edit user roles in general
      // But cannot edit instructor roles (they are managed automatically)
      cannot('edit', 'UserRole', { role: 'instructor' });
      
      // Explicitly deny role-specific permissions that admins shouldn't have
      cannot('create', 'StudentBooking');
      cannot('access', 'StudentPayments');
      cannot('manage', 'OwnInstructorCalendar');
      cannot('manage', 'OwnInstructorAvailability');
    }

    // Global restrictions that apply regardless of role
    // These will be enforced in middleware with additional context
  });
};

/**
 * Helper function to check if a user can perform an action on a resource
 * @param {Object} user - User object
 * @param {string} action - Action to check (create, read, update, delete, manage)
 * @param {string} subjectType - Subject/resource type
 * @param {Object} resource - Optional resource object for context
 * @returns {boolean} Whether the action is allowed
 */
const can = (user, action, subjectType, resource = null) => {
  const ability = defineAbilitiesFor(user);
  
  // If no resource provided, check general permission
  if (!resource) {
    return ability.can(action, subjectType);
  }
  
  // Create a proper subject instance for CASL using the subject helper
  const subjectInstance = subject(subjectType, resource);
  return ability.can(action, subjectInstance);
};

/**
 * Helper function to check time-based restrictions for bookings
 * @param {Object} user - User object
 * @param {Object} booking - Booking object with date
 * @param {string} action - Action to check
 * @returns {boolean} Whether the action is allowed considering time restrictions
 */
const canBookingAction = (user, booking, action) => {
  if (!booking || !user) return false;
  
  // Handle instructor permissions by checking if they own the booking
  // Only for existing booking operations (not creation)
  if (user.role === 'instructor' && (action === 'update' || action === 'cancel' || action === 'manage')) {
    // Only check instructor ownership if we have instructor data in the booking
    if (booking.Instructor && booking.Instructor.User) {
      // Check if this instructor owns the booking by comparing user IDs
      if (booking.Instructor.User.id === user.id) {
        return true; // Instructor can manage their own students' bookings
      }
      return false; // Not their booking - instructor cannot manage other instructors' bookings
    }
    // If no instructor data, fall through to standard CASL check
  }
  
  // For all other cases, use the standard CASL permission check
  const hasBasePermission = can(user, action, 'Booking', booking);
  
  if (!hasBasePermission) return false;
  
  // Apply time-based restrictions for students
  if (user.role === 'student' && (action === 'update' || action === 'cancel')) {
    // Create booking datetime using date helpers
    const bookingHelper = fromString(booking.date);
    
    // Handle malformed dates gracefully
    if (!bookingHelper.isValid()) {
      return false; // Invalid date, deny access
    }
    
    // Add the slot time to get the actual booking time
    if (booking.start_slot !== undefined) {
      const hours = Math.floor(booking.start_slot / 4);
      const minutes = (booking.start_slot % 4) * 15;
      const bookingDateTime = bookingHelper.addHours(hours).addMinutes(minutes);
      
      // Students cannot modify bookings within 24 hours using business logic helper
      if (bookingDateTime.isWithinCancellationWindow(24)) {
        return false;
      }
    }
  }
  
  return true;
};

module.exports = {
  defineAbilitiesFor,
  can,
  canBookingAction
};