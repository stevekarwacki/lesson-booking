/**
 * Error Helper Utilities
 * Centralized error message extraction and handling
 */

/**
 * Extract error message from various error response formats
 * Handles Axios errors, API errors, and generic errors
 * @param {Error|Object} error - Error object from API or exception
 * @param {string} fallbackMessage - Default message if extraction fails
 * @returns {string} Extracted or fallback error message
 */
export function extractErrorMessage(error, fallbackMessage = 'An unexpected error occurred') {
  // Check for Axios response error with message
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  
  // Check for Axios response error with error field
  if (error.response?.data?.error) {
    return error.response.data.error
  }
  
  // Check for standard Error.message
  if (error.message) {
    return error.message
  }
  
  // Fallback to provided default message
  return fallbackMessage
}

