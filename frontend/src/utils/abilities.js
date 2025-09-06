import { defineAbility, subject } from '@casl/ability';

/**
 * Define abilities for a user based on their role and context
 * @param {Object} user - User object with role and other properties
 * @returns {Ability} CASL ability instance
 */
export const defineAbilitiesFor = (user) => {
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
      can('update', 'Booking', { student_id: user.id, status: 'booked' });
      can('cancel', 'Booking', { student_id: user.id });
      
      // Students can read active instructors
      can('read', 'Instructor', { is_active: true });
      
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
      
      // Availability management (own only)
      can('manage', 'Availability', { instructor_id: user.instructor_id });
      can('manage', 'OwnInstructorAvailability');
      
      // Read students who have bookings with them
      can('read', 'Student'); // Will be filtered by booking relationship in routes
      
      // Calendar and schedule management
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
export const can = (user, action, subjectType, resource = null) => {
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
export const canBookingAction = (user, booking, action) => {
  if (!booking || !user) return false;
  
  // Get base permission using the updated can function
  const hasBasePermission = can(user, action, 'Booking', booking);
  
  if (!hasBasePermission) return false;
  
  // Apply time-based restrictions for students
  if (user.role === 'student' && (action === 'update' || action === 'cancel')) {
    const bookingDate = new Date(booking.date);
    const now = new Date();
    const hoursUntil = (bookingDate - now) / (1000 * 60 * 60);
    
    // Students cannot modify bookings within 24 hours
    if (hoursUntil < 24) {
      return false;
    }
  }
  
  return true;
};