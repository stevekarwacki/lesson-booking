import { computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { defineAbilitiesFor, can, canBookingAction, canAccessUserData } from '@/utils/abilities';
import { fromString, today } from '../utils/dateHelpers.js';

/**
 * Composable for checking user permissions using CASL
 * @returns {Object} Permission checking utilities
 */
export function useAbilities() {
  const userStore = useUserStore();
  
  // Reactive ability instance based on current user
  const ability = computed(() => {
    return defineAbilitiesFor(userStore.user);
  });

  // Basic permission check
  const checkCan = (action, subject, resource) => {
    return can(userStore.user, action, subject, resource);
  };

  // Inverse permission check
  const checkCannot = (action, subject, resource) => {
    return !checkCan(action, subject, resource);
  };

  // Booking-specific permission checks with time restrictions
  const canEditBooking = (booking) => {
    return canBookingAction(userStore.user, booking, 'update');
  };

  const canCancelBooking = (booking) => {
    return canBookingAction(userStore.user, booking, 'cancel');
  };

  const canViewBooking = (booking) => {
    return canBookingAction(userStore.user, booking, 'read');
  };

  // User data access checks
  const canAccessUser = (targetUserId) => {
    return canAccessUserData(userStore.user, targetUserId);
  };

  // Admin-specific checks
  const isAdmin = computed(() => {
    return userStore.user?.role === 'admin';
  });

  const canManageUsers = computed(() => {
    return checkCan('manage', 'User');
  });

  const canManagePackages = computed(() => {
    return checkCan('manage', 'Package');
  });

  const canManageSubscriptions = computed(() => {
    return checkCan('manage', 'Subscription');
  });

  // Instructor-specific checks
  const isInstructor = computed(() => {
    return userStore.user?.role === 'instructor';
  });

  const canManageAvailability = computed(() => {
    return checkCan('manage', 'Availability');
  });

  const canManageInstructorProfile = computed(() => {
    return checkCan('update', 'Instructor', { user_id: userStore.user?.id });
  });

  // Student-specific checks
  const isStudent = computed(() => {
    return userStore.user?.role === 'student';
  });

  const canCreateBooking = computed(() => {
    return checkCan('create', 'Booking');
  });

  const canPurchasePackages = computed(() => {
    return checkCan('purchase', 'Package');
  });

  // Helper to get disabled state and reason for booking actions
  const getBookingActionState = (booking, action) => {
    if (!booking || !userStore.user) {
      return { disabled: true, reason: 'Not available' };
    }

    const ability = defineAbilitiesFor(userStore.user);
    const hasBasePermission = ability.can(action, 'Booking', booking);

    if (!hasBasePermission) {
      return { disabled: true, reason: 'Permission denied' };
    }

    // Check time restrictions for students
    if (userStore.user.role === 'student' && (action === 'update' || action === 'cancel')) {
      const bookingHelper = fromString(booking.date);
      const nowHelper = today();
      
      // Use business logic helper for consistent cancellation window logic
      if (bookingHelper.isWithinCancellationWindow(24)) {
        return { 
          disabled: true, 
          reason: 'Cannot modify booking within 24 hours' 
        };
      }
    }

    return { disabled: false, reason: null };
  };

  // Helper to check if current user can view/edit specific user data
  const canViewUserData = (targetUser) => {
    if (!targetUser || !userStore.user) return false;
    return canAccessUser(targetUser.id);
  };

  // Helper for role-based UI rendering
  const shouldShowAdminFeatures = computed(() => {
    return isAdmin.value;
  });

  const shouldShowInstructorFeatures = computed(() => {
    return isInstructor.value || isAdmin.value;
  });

  const shouldShowStudentFeatures = computed(() => {
    return isStudent.value || isInstructor.value || isAdmin.value;
  });

  return {
    // Core ability instance
    ability,
    
    // Basic permission checks
    can: checkCan,
    cannot: checkCannot,
    
    // Booking-specific checks
    canEditBooking,
    canCancelBooking,
    canViewBooking,
    getBookingActionState,
    
    // User access checks
    canAccessUser,
    canViewUserData,
    
    // Role-based computed properties
    isAdmin,
    isInstructor,
    isStudent,
    
    // Feature-specific permissions
    canManageUsers,
    canManagePackages,
    canManageSubscriptions,
    canManageAvailability,
    canManageInstructorProfile,
    canCreateBooking,
    canPurchasePackages,
    
    // UI visibility helpers
    shouldShowAdminFeatures,
    shouldShowInstructorFeatures,
    shouldShowStudentFeatures
  };
}
