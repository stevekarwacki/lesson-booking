import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFormFeedback } from '../composables/useFormFeedback'

// Mock vue-toastification
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn()
}

vi.mock('vue-toastification', () => ({
  useToast: () => mockToast
}))

describe('useFormFeedback Composable', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  describe('showSuccess', () => {
    it('should call toast.success with message', () => {
      const { showSuccess } = useFormFeedback()
      
      showSuccess('Operation completed!')
      
      expect(mockToast.success).toHaveBeenCalledWith('Operation completed!', {})
    })

    it('should accept custom options', () => {
      const { showSuccess } = useFormFeedback()
      const options = { timeout: 2000 }
      
      showSuccess('Success!', options)
      
      expect(mockToast.success).toHaveBeenCalledWith('Success!', options)
    })
  })

  describe('showError', () => {
    it('should call toast.error with string message', () => {
      const { showError } = useFormFeedback()
      
      showError('Something went wrong')
      
      expect(mockToast.error).toHaveBeenCalledWith('Something went wrong', {})
    })

    it('should extract message from Error object', () => {
      const { showError } = useFormFeedback()
      const error = new Error('Failed to connect')
      
      showError(error)
      
      expect(mockToast.error).toHaveBeenCalledWith('Failed to connect', {})
    })

    it('should accept custom options', () => {
      const { showError } = useFormFeedback()
      const options = { timeout: 5000 }
      
      showError('Error!', options)
      
      expect(mockToast.error).toHaveBeenCalledWith('Error!', options)
    })
  })

  describe('showWarning', () => {
    it('should call toast.warning with message', () => {
      const { showWarning } = useFormFeedback()
      
      showWarning('Please review this')
      
      expect(mockToast.warning).toHaveBeenCalledWith('Please review this', {})
    })
  })

  describe('showInfo', () => {
    it('should call toast.info with message', () => {
      const { showInfo } = useFormFeedback()
      
      showInfo('FYI: Something happened')
      
      expect(mockToast.info).toHaveBeenCalledWith('FYI: Something happened', {})
    })
  })

  describe('handleError', () => {
    it('should handle Error object with prefix', () => {
      const { handleError } = useFormFeedback()
      const error = new Error('Connection timeout')
      
      handleError(error, 'Failed to save: ')
      
      expect(mockToast.error).toHaveBeenCalledWith('Failed to save: Connection timeout')
    })

    it('should handle string error with prefix', () => {
      const { handleError } = useFormFeedback()
      
      handleError('Invalid input', 'Validation error: ')
      
      expect(mockToast.error).toHaveBeenCalledWith('Validation error: Invalid input')
    })

    it('should handle error without prefix', () => {
      const { handleError } = useFormFeedback()
      
      handleError('Network error')
      
      expect(mockToast.error).toHaveBeenCalledWith('Network error')
    })

    it('should handle Error object without prefix', () => {
      const { handleError } = useFormFeedback()
      const error = new Error('Server error')
      
      handleError(error)
      
      expect(mockToast.error).toHaveBeenCalledWith('Server error')
    })
  })

  describe('showValidationErrors', () => {
    it('should return true when no validation errors', () => {
      const { showValidationErrors } = useFormFeedback()
      
      const result = showValidationErrors({})
      
      expect(result).toBe(true)
      expect(mockToast.error).not.toHaveBeenCalled()
    })

    it('should return true when all values are empty/null', () => {
      const { showValidationErrors } = useFormFeedback()
      
      const result = showValidationErrors({
        field1: '',
        field2: null,
        field3: undefined
      })
      
      expect(result).toBe(true)
      expect(mockToast.error).not.toHaveBeenCalled()
    })

    it('should show single validation error', () => {
      const { showValidationErrors } = useFormFeedback()
      
      const result = showValidationErrors({
        email: 'Email is required'
      })
      
      expect(result).toBe(false)
      expect(mockToast.error).toHaveBeenCalledWith('Email is required')
    })

    it('should show multiple validation errors formatted', () => {
      const { showValidationErrors } = useFormFeedback()
      
      const result = showValidationErrors({
        email: 'Email is required',
        password: 'Password must be at least 8 characters'
      })
      
      expect(result).toBe(false)
      expect(mockToast.error).toHaveBeenCalledWith(
        'Validation failed: email: Email is required, password: Password must be at least 8 characters',
        { timeout: 6000 }
      )
    })

    it('should filter out empty error values', () => {
      const { showValidationErrors } = useFormFeedback()
      
      const result = showValidationErrors({
        email: 'Email is required',
        password: '',
        name: null
      })
      
      expect(result).toBe(false)
      expect(mockToast.error).toHaveBeenCalledWith('Email is required')
    })
  })

  describe('composable returns', () => {
    it('should return all methods', () => {
      const feedback = useFormFeedback()
      
      expect(feedback).toHaveProperty('showSuccess')
      expect(feedback).toHaveProperty('showError')
      expect(feedback).toHaveProperty('showWarning')
      expect(feedback).toHaveProperty('showInfo')
      expect(feedback).toHaveProperty('handleError')
      expect(feedback).toHaveProperty('showValidationErrors')
      
      expect(typeof feedback.showSuccess).toBe('function')
      expect(typeof feedback.showError).toBe('function')
      expect(typeof feedback.showWarning).toBe('function')
      expect(typeof feedback.showInfo).toBe('function')
      expect(typeof feedback.handleError).toBe('function')
      expect(typeof feedback.showValidationErrors).toBe('function')
    })
  })
})

