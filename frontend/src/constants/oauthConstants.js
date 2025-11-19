/**
 * OAuth Constants
 * Centralized error messages, timeouts, and configuration for OAuth flow
 */

// Error messages
export const OAUTH_ERRORS = {
  POPUP_BLOCKED: 'Popup blocked. Please allow popups and try again.',
  OAUTH_FAILED: 'OAuth failed',
  OAUTH_CANCELLED: 'OAuth cancelled by user',
  OAUTH_TIMEOUT: 'OAuth timeout - please try again',
  CONNECTION_FAILED: 'Failed to start OAuth connection',
  DISCONNECT_FAILED: 'Failed to disconnect OAuth',
  STATUS_CHECK_FAILED: 'Failed to check OAuth status',
  UNEXPECTED_ERROR: 'An unexpected error occurred while connecting Google Calendar',
  CALLBACK_FAILED: 'Failed to connect Google Calendar'
}

// Timing constants
export const OAUTH_TIMEOUTS = {
  BACKEND_SETTLE_MS: 1000,           // Wait time for backend to finish processing
  OAUTH_TIMEOUT_MS: 5 * 60 * 1000    // 5 minutes timeout for OAuth flow
}

// OAuth popup window configuration
export const OAUTH_POPUP_CONFIG = {
  NAME: 'google-oauth',
  FEATURES: 'width=600,height=700,scrollbars=yes,resizable=yes'
}

// Message types for postMessage communication
export const OAUTH_MESSAGE_TYPES = {
  SUCCESS: 'oauth-success',
  ERROR: 'oauth-error',
  CANCELLED: 'oauth-cancelled'
}

