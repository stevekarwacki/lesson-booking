import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EditBooking from '../components/EditBooking.vue'
import { useUserStore } from '../stores/userStore'
import { useScheduleStore } from '../stores/scheduleStore'
import { useSettingsStore } from '../stores/settingsStore'
import { today } from '../utils/dateHelpers.js'

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock vue-toastification
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn()
}

vi.mock('vue-toastification', () => ({
  useToast: () => mockToast,
  POSITION: {
    TOP_RIGHT: 'top-right'
  }
}))

describe('Rescheduling UX with Toast Notifications', () => {
  let pinia
  let userStore
  let scheduleStore
  let settingsStore
  
  const todayHelper = today()
  const tomorrowHelper = todayHelper.addDays(1)
  const todayStr = todayHelper.toDateString()
  const tomorrowStr = tomorrowHelper.toDateString()

  const mockBooking = {
    id: 1,
    date: tomorrowStr,
    start_slot: 32, // 8:00 AM
    duration: 2, // 30 minutes
    instructor_id: 1,
    student_id: 2,
    status: 'booked',
    Instructor: {
      User: {
        name: 'Test Instructor'
      }
    }
  }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    userStore = useUserStore()
    scheduleStore = useScheduleStore()
    settingsStore = useSettingsStore()
    
    // Setup mock user as student with token
    userStore.user = {
      id: 2,
      name: 'Test Student',
      email: 'student@test.com',
      role: 'student'
    }
    userStore.token = 'mock-token'
    userStore.isAuthenticated = true
    
    // Initialize settings store
    settingsStore.config.slotDuration = 2
    settingsStore.config.defaultLessonDurationMinutes = 30
    
    // Reset mocks
    fetch.mockClear()
    mockToast.success.mockClear()
    mockToast.error.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Rescheduling', () => {
    it('should show success toast after rescheduling booking', async () => {
      // Mock API responses for fetching schedule
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([
            { start_slot: 36, duration: 4, day_of_week: 1 } // Available slot at 9:00 AM
          ])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([mockBooking]) // Current booking
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Booking updated' })
        })

      const wrapper = mount(EditBooking, {
        props: {
          booking: mockBooking
        },
        global: {
          plugins: [pinia]
        }
      })

      // Wait for component to mount and load schedule
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Simulate selecting a new slot
      wrapper.vm.selectedSlot = {
        date: new Date(tomorrowStr),
        startSlot: 36,
        duration: 2,
        instructorId: 1
      }

      // Trigger update booking
      await wrapper.vm.updateBooking()
      await wrapper.vm.$nextTick()

      // Verify success toast was called
      expect(mockToast.success).toHaveBeenCalledWith('Booking rescheduled successfully!')
      
      // Verify booking-updated event was emitted (parent handles modal closing)
      expect(wrapper.emitted('booking-updated')).toBeTruthy()
    })

    it('should show success toast after cancelling booking', async () => {
      // Mock API responses
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Booking cancelled' })
        })

      // Mock window.confirm
      global.confirm = vi.fn(() => true)

      const wrapper = mount(EditBooking, {
        props: {
          booking: mockBooking
        },
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.vm.$nextTick()

      // Trigger cancel booking
      await wrapper.vm.cancelBooking()
      await wrapper.vm.$nextTick()

      // Verify success toast was called
      expect(mockToast.success).toHaveBeenCalledWith('Booking cancelled successfully!')
      
      // Verify booking-cancelled event was emitted (parent handles modal closing)
      expect(wrapper.emitted('booking-cancelled')).toBeTruthy()
    })
  })

  describe('Failed Rescheduling', () => {
    it('should show error toast when rescheduling fails', async () => {
      // Mock API responses - failure on update
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([
            { start_slot: 36, duration: 4, day_of_week: 1 }
          ])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([mockBooking])
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Time slot no longer available' })
        })

      const wrapper = mount(EditBooking, {
        props: {
          booking: mockBooking
        },
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Simulate selecting a new slot
      wrapper.vm.selectedSlot = {
        date: new Date(tomorrowStr),
        startSlot: 36,
        duration: 2,
        instructorId: 1
      }

      // Trigger update booking
      await wrapper.vm.updateBooking()
      await wrapper.vm.$nextTick()

      // Verify error toast was called
      expect(mockToast.error).toHaveBeenCalledWith('Failed to reschedule: Time slot no longer available')
      
      // Verify booking-updated event was NOT emitted (failed operation)
      expect(wrapper.emitted('booking-updated')).toBeFalsy()
    })

    it('should show error toast when cancellation fails', async () => {
      // Mock API responses - failure on cancel
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([])
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Cannot cancel within 24 hours' })
        })

      // Mock window.confirm
      global.confirm = vi.fn(() => true)

      const wrapper = mount(EditBooking, {
        props: {
          booking: mockBooking
        },
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.vm.$nextTick()

      // Trigger cancel booking
      await wrapper.vm.cancelBooking()
      await wrapper.vm.$nextTick()

      // Verify error toast was called
      expect(mockToast.error).toHaveBeenCalledWith('Failed to cancel booking: Cannot cancel within 24 hours')
      
      // Verify booking-cancelled event was NOT emitted (failed operation)
      expect(wrapper.emitted('booking-cancelled')).toBeFalsy()
    })
  })

  describe('Modal Behavior', () => {
    it('should emit booking-updated on successful reschedule', async () => {
      // Mock successful API responses
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([
            { start_slot: 36, duration: 4, day_of_week: 1 }
          ])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([mockBooking])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })

      const wrapper = mount(EditBooking, {
        props: {
          booking: mockBooking
        },
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      wrapper.vm.selectedSlot = {
        date: new Date(tomorrowStr),
        startSlot: 36,
        duration: 2,
        instructorId: 1
      }

      await wrapper.vm.updateBooking()
      await wrapper.vm.$nextTick()

      // Verify booking-updated event was emitted (parent will handle closing)
      const updateEvents = wrapper.emitted('booking-updated')
      
      expect(updateEvents).toBeTruthy()
      expect(updateEvents.length).toBe(1)
    })

    it('should NOT emit events when validation error prevents update', async () => {
      // Mock API responses
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([
            { start_slot: 36, duration: 4, day_of_week: 1 }
          ])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([mockBooking])
        })

      const wrapper = mount(EditBooking, {
        props: {
          booking: mockBooking
        },
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.vm.$nextTick()

      // Try to update without selecting a slot (validation error)
      wrapper.vm.selectedSlot = null
      await wrapper.vm.updateBooking()
      await wrapper.vm.$nextTick()

      // Verify no events were emitted (function returns early)
      expect(wrapper.emitted('booking-updated')).toBeFalsy()
      expect(mockToast.success).not.toHaveBeenCalled()
    })
  })
})

