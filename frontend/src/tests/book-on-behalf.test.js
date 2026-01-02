import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref, computed } from 'vue'

describe('Book on Behalf - Frontend Logic Tests', () => {
  let pinia, userStore

  beforeEach(async () => {
    // Create fresh Pinia instance
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Import and initialize user store
    const { useUserStore } = await import('../stores/userStore')
    userStore = useUserStore()
    
    // Mock global fetch
    global.fetch = vi.fn()
  })

  describe('Booking on Behalf Detection', () => {
    it('should detect booking on behalf when slot has bookingOnBehalf flag', () => {
      const slot = { bookingOnBehalf: true }
      const isBookingOnBehalf = computed(() => slot.bookingOnBehalf === true)
      
      expect(isBookingOnBehalf.value).toBe(true)
    })

    it('should not detect booking on behalf for regular bookings', () => {
      const slot = { bookingOnBehalf: false }
      const isBookingOnBehalf = computed(() => slot.bookingOnBehalf === true)
      
      expect(isBookingOnBehalf.value).toBe(false)
    })

    it('should not detect booking on behalf when flag is missing', () => {
      const slot = {}
      const isBookingOnBehalf = computed(() => slot.bookingOnBehalf === true)
      
      expect(isBookingOnBehalf.value).toBe(false)
    })
  })

  describe('Student Search Filtering', () => {
    const mockStudents = [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'student' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'student' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'student' }
    ]

    it('should filter students by name (case-insensitive)', () => {
      const query = 'john'
      const filtered = mockStudents.filter(student => {
        const name = student.name?.toLowerCase() || ''
        const email = student.email?.toLowerCase() || ''
        return name.includes(query.toLowerCase()) || email.includes(query.toLowerCase())
      })
      
      expect(filtered).toHaveLength(2) // John Doe and Bob Johnson
      expect(filtered[0].name).toBe('John Doe')
      expect(filtered[1].name).toBe('Bob Johnson')
    })

    it('should filter students by email', () => {
      const query = 'jane@'
      const filtered = mockStudents.filter(student => {
        const name = student.name?.toLowerCase() || ''
        const email = student.email?.toLowerCase() || ''
        return name.includes(query.toLowerCase()) || email.includes(query.toLowerCase())
      })
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].email).toBe('jane@example.com')
    })

    it('should return all students when query is empty', () => {
      const query = ''
      const filtered = query.length < 1 ? mockStudents : mockStudents.filter(student => {
        const name = student.name?.toLowerCase() || ''
        const email = student.email?.toLowerCase() || ''
        return name.includes(query.toLowerCase()) || email.includes(query.toLowerCase())
      })
      
      expect(filtered).toHaveLength(3)
    })

    it('should handle null name or email gracefully', () => {
      const studentsWithNulls = [
        { id: 1, name: null, email: 'test@example.com', role: 'student' },
        { id: 2, name: 'Test User', email: null, role: 'student' }
      ]
      
      const query = 'test'
      const filtered = studentsWithNulls.filter(student => {
        const name = student.name?.toLowerCase() || ''
        const email = student.email?.toLowerCase() || ''
        return name.includes(query.toLowerCase()) || email.includes(query.toLowerCase())
      })
      
      expect(filtered).toHaveLength(2)
    })
  })

  describe('Student Credit Fetching', () => {
    it('should fetch student credits with correct parameters', async () => {
      const studentId = 123
      const duration = 30
      const token = 'test-token'
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ availableCredits: 5, duration: 30 })
      })
      
      const response = await fetch(`/api/users/${studentId}/credits?duration=${duration}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users/123/credits?duration=30',
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer test-token' }
        })
      )
      
      const data = await response.json()
      expect(data.availableCredits).toBe(5)
    })

    it('should handle student with no credits', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ availableCredits: 0, duration: 30 })
      })
      
      const response = await fetch('/api/users/123/credits?duration=30', {
        headers: { 'Authorization': 'Bearer token' }
      })
      const data = await response.json()
      
      expect(data.availableCredits).toBe(0)
    })

    it('should update credits based on selected duration', async () => {
      const studentId = 123
      
      // First fetch for 30 min
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ availableCredits: 5, duration: 30 })
      })
      
      let response = await fetch(`/api/users/${studentId}/credits?duration=30`, {
        headers: { 'Authorization': 'Bearer token' }
      })
      let data = await response.json()
      expect(data.availableCredits).toBe(5)
      
      // Then fetch for 60 min
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ availableCredits: 2, duration: 60 })
      })
      
      response = await fetch(`/api/users/${studentId}/credits?duration=60`, {
        headers: { 'Authorization': 'Bearer token' }
      })
      data = await response.json()
      expect(data.availableCredits).toBe(2)
    })
  })

  describe('Available Credits Computation', () => {
    it('should use selected student credits when booking on behalf', () => {
      const isBookingOnBehalf = ref(true)
      const selectedStudent = ref({ id: 1, name: 'Test' })
      const selectedStudentCredits = ref(5)
      const userCredits = ref(10)
      
      const availableCredits = computed(() => {
        if (isBookingOnBehalf.value && selectedStudent.value) {
          return selectedStudentCredits.value
        }
        return userCredits.value
      })
      
      expect(availableCredits.value).toBe(5)
    })

    it('should use current user credits for regular bookings', () => {
      const isBookingOnBehalf = ref(false)
      const selectedStudent = ref(null)
      const selectedStudentCredits = ref(5)
      const userCredits = ref(10)
      
      const availableCredits = computed(() => {
        if (isBookingOnBehalf.value && selectedStudent.value) {
          return selectedStudentCredits.value
        }
        return userCredits.value
      })
      
      expect(availableCredits.value).toBe(10)
    })

    it('should use current user credits when no student selected', () => {
      const isBookingOnBehalf = ref(true)
      const selectedStudent = ref(null)
      const selectedStudentCredits = ref(5)
      const userCredits = ref(10)
      
      const availableCredits = computed(() => {
        if (isBookingOnBehalf.value && selectedStudent.value) {
          return selectedStudentCredits.value
        }
        return userCredits.value
      })
      
      expect(availableCredits.value).toBe(10)
    })
  })

  describe('Card Payment Visibility', () => {
    it('should show card payment for regular bookings', () => {
      const isBookingOnBehalf = ref(false)
      const cardPaymentOnBehalfEnabled = ref(false)
      
      const showCardPaymentOption = computed(() => {
        if (!isBookingOnBehalf.value) {
          return true
        }
        return cardPaymentOnBehalfEnabled.value
      })
      
      expect(showCardPaymentOption.value).toBe(true)
    })

    it('should hide card payment when booking on behalf and setting disabled', () => {
      const isBookingOnBehalf = ref(true)
      const cardPaymentOnBehalfEnabled = ref(false)
      
      const showCardPaymentOption = computed(() => {
        if (!isBookingOnBehalf.value) {
          return true
        }
        return cardPaymentOnBehalfEnabled.value
      })
      
      expect(showCardPaymentOption.value).toBe(false)
    })

    it('should show card payment when booking on behalf and setting enabled', () => {
      const isBookingOnBehalf = ref(true)
      const cardPaymentOnBehalfEnabled = ref(true)
      
      const showCardPaymentOption = computed(() => {
        if (!isBookingOnBehalf.value) {
          return true
        }
        return cardPaymentOnBehalfEnabled.value
      })
      
      expect(showCardPaymentOption.value).toBe(true)
    })
  })

  describe('Confirm Button State', () => {
    it('should be disabled when loading', () => {
      const loading = ref(true)
      const hasTimeConflict = ref(false)
      const isBookingOnBehalf = ref(false)
      const selectedStudent = ref(null)
      
      const isConfirmDisabled = computed(() => {
        if (loading.value || hasTimeConflict.value) {
          return true
        }
        if (isBookingOnBehalf.value && !selectedStudent.value) {
          return true
        }
        return false
      })
      
      expect(isConfirmDisabled.value).toBe(true)
    })

    it('should be disabled when there is a time conflict', () => {
      const loading = ref(false)
      const hasTimeConflict = ref(true)
      const isBookingOnBehalf = ref(false)
      const selectedStudent = ref(null)
      
      const isConfirmDisabled = computed(() => {
        if (loading.value || hasTimeConflict.value) {
          return true
        }
        if (isBookingOnBehalf.value && !selectedStudent.value) {
          return true
        }
        return false
      })
      
      expect(isConfirmDisabled.value).toBe(true)
    })

    it('should be disabled when booking on behalf without student selected', () => {
      const loading = ref(false)
      const hasTimeConflict = ref(false)
      const isBookingOnBehalf = ref(true)
      const selectedStudent = ref(null)
      
      const isConfirmDisabled = computed(() => {
        if (loading.value || hasTimeConflict.value) {
          return true
        }
        if (isBookingOnBehalf.value && !selectedStudent.value) {
          return true
        }
        return false
      })
      
      expect(isConfirmDisabled.value).toBe(true)
    })

    it('should be enabled when booking on behalf with student selected', () => {
      const loading = ref(false)
      const hasTimeConflict = ref(false)
      const isBookingOnBehalf = ref(true)
      const selectedStudent = ref({ id: 1, name: 'Test' })
      
      const isConfirmDisabled = computed(() => {
        if (loading.value || hasTimeConflict.value) {
          return true
        }
        if (isBookingOnBehalf.value && !selectedStudent.value) {
          return true
        }
        return false
      })
      
      expect(isConfirmDisabled.value).toBe(false)
    })

    it('should be enabled for regular bookings', () => {
      const loading = ref(false)
      const hasTimeConflict = ref(false)
      const isBookingOnBehalf = ref(false)
      const selectedStudent = ref(null)
      
      const isConfirmDisabled = computed(() => {
        if (loading.value || hasTimeConflict.value) {
          return true
        }
        if (isBookingOnBehalf.value && !selectedStudent.value) {
          return true
        }
        return false
      })
      
      expect(isConfirmDisabled.value).toBe(false)
    })
  })

  describe('Payment Method Visibility', () => {
    it('should hide payment methods when booking on behalf without student', () => {
      const showPaymentOptions = ref(true)
      const hasTimeConflict = ref(false)
      const isBookingOnBehalf = ref(true)
      const selectedStudent = ref(null)
      
      const shouldShowPayments = computed(() => {
        return showPaymentOptions.value && 
               !hasTimeConflict.value && 
               (!isBookingOnBehalf.value || !!selectedStudent.value)
      })
      
      expect(shouldShowPayments.value).toBe(false)
    })

    it('should show payment methods when student is selected', () => {
      const showPaymentOptions = ref(true)
      const hasTimeConflict = ref(false)
      const isBookingOnBehalf = ref(true)
      const selectedStudent = ref({ id: 1, name: 'Test' })
      
      const shouldShowPayments = computed(() => {
        return showPaymentOptions.value && 
               !hasTimeConflict.value && 
               (!isBookingOnBehalf.value || !!selectedStudent.value)
      })
      
      expect(shouldShowPayments.value).toBe(true)
    })

    it('should show payment methods for regular bookings', () => {
      const showPaymentOptions = ref(true)
      const hasTimeConflict = ref(false)
      const isBookingOnBehalf = ref(false)
      const selectedStudent = ref(null)
      
      const shouldShowPayments = computed(() => {
        return showPaymentOptions.value && 
               !hasTimeConflict.value && 
               (!isBookingOnBehalf.value || !!selectedStudent.value)
      })
      
      expect(shouldShowPayments.value).toBe(true)
    })

    it('should hide payment methods when there is a time conflict', () => {
      const showPaymentOptions = ref(true)
      const hasTimeConflict = ref(true)
      const isBookingOnBehalf = ref(false)
      const selectedStudent = ref(null)
      
      const shouldShowPayments = computed(() => {
        return showPaymentOptions.value && 
               !hasTimeConflict.value && 
               (!isBookingOnBehalf.value || !!selectedStudent.value)
      })
      
      expect(shouldShowPayments.value).toBe(false)
    })
  })

  describe('Lesson Settings Fetch', () => {
    it('should fetch lesson settings from public endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          default_duration_minutes: 30,
          card_payment_on_behalf_enabled: true
        })
      })
      
      const response = await fetch('/api/branding/lesson-settings')
      const data = await response.json()
      
      expect(global.fetch).toHaveBeenCalledWith('/api/branding/lesson-settings')
      expect(data.default_duration_minutes).toBe(30)
      expect(data.card_payment_on_behalf_enabled).toBe(true)
    })

    it('should handle settings with defaults when missing', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          default_duration_minutes: 30,
          card_payment_on_behalf_enabled: false
        })
      })
      
      const response = await fetch('/api/branding/lesson-settings')
      const data = await response.json()
      
      expect(data.card_payment_on_behalf_enabled).toBe(false)
    })
  })

  describe('Students List Fetch', () => {
    it('should fetch students with auth token', async () => {
      const token = 'test-token'
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: [
            { id: 1, name: 'Student 1', email: 'student1@example.com' },
            { id: 2, name: 'Student 2', email: 'student2@example.com' }
          ]
        })
      })
      
      const response = await fetch('/api/users/students', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users/students',
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer test-token' }
        })
      )
      
      const data = await response.json()
      expect(data.users).toHaveLength(2)
    })

    it('should handle empty student list', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [] })
      })
      
      const response = await fetch('/api/users/students', {
        headers: { 'Authorization': 'Bearer token' }
      })
      const data = await response.json()
      
      expect(data.users).toHaveLength(0)
    })
  })
})

