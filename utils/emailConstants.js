/**
 * Email Template Constants
 * Centralized fallback strings and default values for email generation
 */

// Default fallback values
const DEFAULTS = {
    BUSINESS_NAME: 'Lesson Booking',
    PAYMENT_METHOD_CARD: 'Credit Card',
    PAYMENT_METHOD_CREDITS: 'Lesson Credits',
    PLACEHOLDER_URL: '#',
    PLACEHOLDER_EMPTY: '',
    USER_LABEL_STUDENT: 'Student',
    USER_LABEL_INSTRUCTOR: 'Instructor',
    DATE_NOT_SPECIFIED: 'Not specified'
};

// Button text constants
const BUTTON_TEXT = {
    VIEW_BOOKINGS: 'View My Bookings',
    CONTACT_SUPPORT: 'Contact Support',
    BOOK_NEW_LESSON: 'Book New Lesson',
    MANAGE_LESSONS: 'Manage Lessons',
    CALL_PREFIX: 'Call '
};

// URL paths for email links
const URL_PATHS = {
    BOOKINGS: '/bookings',
    BOOKING: '/booking',
    CREDITS: '/credits'
};

module.exports = {
    DEFAULTS,
    BUTTON_TEXT,
    URL_PATHS
};

