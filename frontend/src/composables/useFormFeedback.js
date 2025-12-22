/**
 * Form Feedback Composable
 * 
 * Provides a consistent pattern for showing user feedback via toast notifications
 * Replaces the common pattern of using ref-based error/success messages
 * 
 * @example
 * import { useFormFeedback } from '@/composables/useFormFeedback'
 * 
 * const { showSuccess, showError, showWarning, showInfo } = useFormFeedback()
 * 
 * try {
 *   await someOperation()
 *   showSuccess('Operation completed successfully!')
 * } catch (error) {
 *   showError(`Failed: ${error.message}`)
 * }
 */

import { useToast } from 'vue-toastification'

export function useFormFeedback() {
  const toast = useToast()

  /**
   * Show a success message
   * @param {string} message - The success message to display
   * @param {object} options - Optional toast options to override defaults
   */
  const showSuccess = (message, options = {}) => {
    toast.success(message, options)
  }

  /**
   * Show an error message
   * @param {string|Error} error - The error message or Error object to display
   * @param {object} options - Optional toast options to override defaults
   */
  const showError = (error, options = {}) => {
    const message = error instanceof Error ? error.message : error
    toast.error(message, options)
  }

  /**
   * Show a warning message
   * @param {string} message - The warning message to display
   * @param {object} options - Optional toast options to override defaults
   */
  const showWarning = (message, options = {}) => {
    toast.warning(message, options)
  }

  /**
   * Show an info message
   * @param {string} message - The info message to display
   * @param {object} options - Optional toast options to override defaults
   */
  const showInfo = (message, options = {}) => {
    toast.info(message, options)
  }

  /**
   * Show error from caught exception with optional prefix
   * Handles both Error objects and string messages
   * @param {Error|string} error - The caught error
   * @param {string} prefix - Optional prefix (e.g., "Failed to save: ")
   */
  const handleError = (error, prefix = '') => {
    const message = error instanceof Error ? error.message : error
    const fullMessage = prefix ? `${prefix}${message}` : message
    toast.error(fullMessage)
  }

  /**
   * Validate and show validation errors
   * Useful for form validation
   * @param {object} validationErrors - Object with field: errorMessage pairs
   * @returns {boolean} - Returns false if there are errors, true otherwise
   */
  const showValidationErrors = (validationErrors) => {
    const errors = Object.entries(validationErrors)
      .filter(([_, value]) => value) // Filter out empty/null values
      
    if (errors.length === 0) {
      return true
    }

    if (errors.length === 1) {
      toast.error(errors[0][1])
    } else {
      const message = errors.map(([field, msg]) => `${field}: ${msg}`).join(', ')
      toast.error(`Validation failed: ${message}`, { timeout: 6000 })
    }
    
    return false
  }

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    handleError,
    showValidationErrors
  }
}

