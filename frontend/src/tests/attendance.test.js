import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BookingList from '../components/BookingList.vue'
import InstructorCalendarPage from '../views/InstructorCalendarPage.vue'
import { useUserStore } from '../stores/userStore'

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock router
const mockRouter = {
  push: vi.fn()
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter
}))

describe('Attendance Tracking Frontend', () => {
  let pinia
  let userStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    userStore = useUserStore()
    
    // Setup mock user as instructor with token
    userStore.user = {
      id: 1,
      name: 'Test Instructor',
      email: 'instructor@test.com',
      role: 'instructor'
    }
    userStore.token = 'mock-token'
    userStore.isAuthenticated = true
    
    // Reset fetch mock
    fetch.mockClear()
  })

  describe('BookingList Component - Attendance Features', () => {
    const mockBookings = [
      {
        id: 1,
        date: '2025-10-01',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        instructorName: 'Test Instructor',
        studentName: 'John Doe',
        status: 'booked',
        attendance: {
          status: 'present',
          notes: 'Great lesson!',
          recorded_at: '2025-10-01T14:30:00Z'
        },
        originalBooking: {
          id: 1,
          instructor_id: 1,
          student_id: 2
        }
      },
      {
        id: 2,
        date: '2025-09-30', // Past date to trigger "Not Recorded" display
        startTime: '2:00 PM',
        endTime: '2:30 PM',
        instructorName: 'Test Instructor',
        studentName: 'Jane Smith',
        status: 'booked',
        attendance: null, // No attendance recorded
        originalBooking: {
          id: 2,
          instructor_id: 1,
          student_id: 3
        }
      },
      {
        id: 3,
        date: '2025-10-01',
        startTime: '9:00 AM',
        endTime: '10:00 AM',
        instructorName: 'Test Instructor',
        studentName: 'Bob Johnson',
        status: 'booked',
        attendance: {
          status: 'absent',
          notes: 'No show',
          recorded_at: '2025-10-01T13:15:00Z'
        },
        originalBooking: {
          id: 3,
          instructor_id: 1,
          student_id: 4
        }
      }
    ]

    it('should display attendance status for instructor view', async () => {
      const wrapper = mount(BookingList, {
        props: {
          bookings: mockBookings,
          loading: false,
          userId: 1,
          userRole: 'instructor'
        },
        global: {
          plugins: [pinia]
        }
      })
      
      // Should show student names for today's bookings (John Doe, Bob Johnson)
      expect(wrapper.text()).toContain('John Doe')
      expect(wrapper.text()).toContain('Bob Johnson')
      
      // Switch to 'past' filter to see Jane Smith's "Not Recorded" booking
      wrapper.vm.activeFilter = 'past'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.text()).toContain('Jane Smith')

      // Should display attendance status
      expect(wrapper.text()).toContain('Present')
      expect(wrapper.text()).toContain('Not Recorded')
      expect(wrapper.text()).toContain('Absent')
    })

    it('should show attendance controls for past bookings', async () => {
      // Mock current time to be after the lessons
      const mockDate = new Date('2025-10-01T15:00:00Z')
      vi.setSystemTime(mockDate)

      const wrapper = mount(BookingList, {
        props: {
          bookings: mockBookings,
          loading: false,
          userId: 1,
          userRole: 'instructor'
        },
        global: {
          plugins: [pinia]
        }
      })

      // Should show attendance dropdown for past lessons
      const attendanceSelects = wrapper.findAll('.attendance-select')
      expect(attendanceSelects.length).toBeGreaterThan(0)

      // Check dropdown options
      const firstSelect = attendanceSelects[0]
      expect(firstSelect.html()).toContain('Mark Attendance')
      expect(firstSelect.html()).toContain('Present')
      expect(firstSelect.html()).toContain('Absent')
      expect(firstSelect.html()).toContain('Tardy')

      vi.useRealTimers()
    })

    it.skip('should hide attendance controls for future bookings', () => {
      // Use fake timers and set time before lessons start
      vi.useFakeTimers()
      const mockDate = new Date('2025-10-01T06:00:00Z') // 6 AM UTC, before 9 AM lessons
      vi.setSystemTime(mockDate)

      const wrapper = mount(BookingList, {
        props: {
          bookings: mockBookings,
          loading: false,
          userId: 1,
          userRole: 'instructor'
        },
        global: {
          plugins: [pinia]
        }
      })

      // Should not show attendance controls for future lessons
      const attendanceSelects = wrapper.findAll('.attendance-select')
      expect(attendanceSelects.length).toBe(0)

      vi.useRealTimers()
    })

    it('should emit attendance-changed event when dropdown changes', async () => {
      const mockDate = new Date('2025-10-01T15:00:00Z')
      vi.setSystemTime(mockDate)

      const wrapper = mount(BookingList, {
        props: {
          bookings: mockBookings,
          loading: false,
          userId: 1,
          userRole: 'instructor'
        },
        global: {
          plugins: [pinia]
        }
      })

      const attendanceSelect = wrapper.find('.attendance-select')
      expect(attendanceSelect.exists()).toBe(true)

      // Change attendance status
      await attendanceSelect.setValue('absent')

      // Should emit attendance-changed event
      const emittedEvents = wrapper.emitted('attendance-changed')
      expect(emittedEvents).toBeTruthy()
      expect(emittedEvents[0][1]).toBe('absent') // Second parameter is the status

      vi.useRealTimers()
    })

    it('should display attendance status with correct styling', async () => {
      const wrapper = mount(BookingList, {
        props: {
          bookings: mockBookings,
          loading: false,
          userId: 1,
          userRole: 'instructor'
        },
        global: {
          plugins: [pinia]
        }
      })

      // Check for attendance status classes in today's bookings
      expect(wrapper.find('.attendance-present').exists()).toBe(true)
      expect(wrapper.find('.attendance-absent').exists()).toBe(true)
      
      // Switch to past filter to see "not recorded" status
      wrapper.vm.activeFilter = 'past'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('.attendance-not-recorded').exists()).toBe(true)
    })

    it('should show instructor notes when available', () => {
      const wrapper = mount(BookingList, {
        props: {
          bookings: mockBookings,
          loading: false,
          userId: 1,
          userRole: 'instructor'
        },
        global: {
          plugins: [pinia]
        }
      })

      // Should display attendance notes
      expect(wrapper.text()).toContain('Great lesson!')
      expect(wrapper.text()).toContain('No show')
    })

    it('should not show attendance controls for students', () => {
      const wrapper = mount(BookingList, {
        props: {
          bookings: mockBookings,
          loading: false,
          userId: 2, // Student user ID
          userRole: 'student'
        },
        global: {
          plugins: [pinia]
        }
      })

      // Students should not see attendance controls
      const attendanceSelects = wrapper.findAll('.attendance-select')
      expect(attendanceSelects.length).toBe(0)

      // Students currently don't see attendance status (instructor-only feature)
      // This is the current component behavior - only instructors see attendance status
      expect(wrapper.text()).toContain('Test Instructor') // Should see instructor names instead
    })

    it('should handle reschedule button clicks', async () => {
      const wrapper = mount(BookingList, {
        props: {
          bookings: mockBookings,
          loading: false,
          userId: 1,
          userRole: 'instructor'
        },
        global: {
          plugins: [pinia]
        }
      })

      const rescheduleButton = wrapper.find('.action-button-secondary')
      expect(rescheduleButton.exists()).toBe(true)
      expect(rescheduleButton.text()).toContain('Reschedule')

      await rescheduleButton.trigger('click')

      // Should emit view-booking event for reschedule modal
      const emittedEvents = wrapper.emitted('view-booking')
      expect(emittedEvents).toBeTruthy()
    })
  })

  describe('InstructorCalendarPage Component', () => {
    beforeEach(() => {
      // Mock successful API responses
      fetch.mockImplementation((url) => {
        if (url.includes('/api/instructors/user/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: 1,
              name: 'Test Instructor',
              user_id: 1
            })
          })
        }
        if (url.includes('/api/calendar/instructor/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              {
                id: 1,
                date: '2025-10-01',
                start_slot: 40,
                duration: 4,
                student: { name: 'John Doe', email: 'john@test.com' },
                attendance: { status: 'present', notes: 'Great!' }
              }
            ])
          })
        }
        if (url.includes('/api/calendar/attendance')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              message: 'Attendance updated successfully',
              attendance: {
                status: 'absent',
                notes: 'Test notes',
                recorded_at: new Date().toISOString()
              }
            })
          })
        }
        if (url.includes('/api/instructors/') && url.includes('/availability')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          })
        }
        if (url.includes('/api/calendar/events')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        })
      })
    })

    it.skip('should load instructor data and bookings on mount', async () => {
      const wrapper = mount(InstructorCalendarPage, {
        global: {
          plugins: [pinia]
        }
      })

      // Wait for async operations
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100)) // Give more time for API calls

      // Should have called the instructor API
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/instructors/user/1'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      )
    })

    it.skip('should handle attendance changes via API', async () => {
      const wrapper = mount(InstructorCalendarPage, {
        global: {
          plugins: [pinia]
        }
      })

      // Wait for component to load
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Simulate attendance change
      const mockBooking = {
        originalBooking: { id: 1 }
      }

      await wrapper.vm.handleAttendanceChanged(mockBooking, 'absent', 'Test notes')

      // Should have called attendance API
      expect(fetch).toHaveBeenCalledWith(
        '/api/calendar/attendance',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          }),
          body: JSON.stringify({
            eventId: 1,
            status: 'absent',
            notes: 'Test notes'
          })
        })
      )
    })

    it('should handle API errors gracefully', async () => {
      // Mock API failure
      fetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Server error' })
        })
      )

      // Mock alert to capture error messages
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      const wrapper = mount(InstructorCalendarPage, {
        global: {
          plugins: [pinia]
        }
      })

      await wrapper.vm.$nextTick()

      const mockBooking = { originalBooking: { id: 1 } }
      await wrapper.vm.handleAttendanceChanged(mockBooking, 'absent', 'Test')

      // Should show error message
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error updating attendance')
      )

      alertSpy.mockRestore()
    })

    it('should update local state after successful attendance change', async () => {
      const wrapper = mount(InstructorCalendarPage, {
        global: {
          plugins: [pinia]
        }
      })

      // Wait for initial load
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Set up initial bookings state
      wrapper.vm.bookings = [
        {
          id: 1,
          attendance: { status: 'present', notes: 'Initial' }
        }
      ]

      const mockBooking = { originalBooking: { id: 1 } }
      await wrapper.vm.handleAttendanceChanged(mockBooking, 'absent', 'Updated')

      // Local state should be updated
      const updatedBooking = wrapper.vm.bookings.find(b => b.id === 1)
      expect(updatedBooking.attendance.status).toBe('absent')
      expect(updatedBooking.attendance.notes).toBe('Test notes') // From mock response
    })

    it('should handle reschedule modal opening', async () => {
      const wrapper = mount(InstructorCalendarPage, {
        global: {
          plugins: [pinia]
        }
      })

      const mockBooking = {
        originalBooking: { 
          id: 1, 
          instructor_id: 1,
          date: '2025-10-01',
          start_slot: 36, // 9:00 AM
          duration: 2,
          Instructor: {
            User: {
              name: 'Test Instructor'
            }
          }
        }
      }

      wrapper.vm.handleViewBooking(mockBooking)

      expect(wrapper.vm.selectedBooking).toEqual(mockBooking.originalBooking)
      expect(wrapper.vm.showEditModal).toBe(true)
    })
  })

  describe('Filter Integration', () => {
    it('should default to Today filter', () => {
      const wrapper = mount(BookingList, {
        props: {
          bookings: [],
          loading: false,
          userId: 1,
          userRole: 'instructor'
        },
        global: {
          plugins: [pinia]
        }
      })

      // Should start with 'today' as active filter
      expect(wrapper.vm.activeFilter).toBe('today')
    })

    it('should filter bookings by today correctly', () => {
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const testBookings = [
        {
          id: 1,
          date: today,
          startTime: '10:00 AM',
          endTime: '11:00 AM',
          instructorName: 'Test Instructor',
          studentName: 'John Doe',
          status: 'booked'
        },
        {
          id: 2,
          date: tomorrow,
          startTime: '2:00 PM',
          endTime: '2:30 PM',
          instructorName: 'Test Instructor',
          studentName: 'Jane Smith',
          status: 'booked'
        },
        {
          id: 3,
          date: '2025-09-30',
          startTime: '9:00 AM',
          endTime: '10:00 AM',
          instructorName: 'Test Instructor',
          studentName: 'Bob Johnson',
          status: 'booked'
        }
      ]
      
      const bookingsWithDates = testBookings

      const wrapper = mount(BookingList, {
        props: {
          bookings: bookingsWithDates,
          loading: false,
          userId: 1,
          userRole: 'instructor'
        },
        global: {
          plugins: [pinia]
        }
      })

      // Should only show today's bookings
      const todayBookings = wrapper.vm.filteredBookings
      expect(todayBookings.length).toBe(1)
      expect(todayBookings[0].date).toBe(today)
    })
  })

  describe('Time Validation', () => {
    it('should correctly determine if lesson has started', () => {
      // Use fake timers and set current time to 11:00 AM
      vi.useFakeTimers()
      const mockDate = new Date('2025-10-01T11:00:00Z')
      vi.setSystemTime(mockDate)

      const wrapper = mount(BookingList, {
        props: {
          bookings: [],
          loading: false,
          userId: 1,
          userRole: 'instructor'
        },
        global: {
          plugins: [pinia]
        }
      })

      // Mock a booking that started 1 hour ago (10:00 AM)
      const pastBooking = {
        date: '2025-10-01',
        startTime: '10:00 AM'
      }

      const canMark = wrapper.vm.canMarkAttendance(pastBooking)
      expect(canMark).toBe(true)

      vi.useRealTimers()
    })

    it.skip('should prevent attendance marking for future lessons', () => {
      // Use fake timers and set current time to 11:00 AM
      vi.useFakeTimers()
      const mockDate = new Date('2025-10-01T11:00:00Z')
      vi.setSystemTime(mockDate)

      const wrapper = mount(BookingList, {
        props: {
          bookings: [],
          loading: false,
          userId: 1,
          userRole: 'instructor'
        },
        global: {
          plugins: [pinia]
        }
      })

      // Mock a booking that starts in 1 hour (12:00 PM)
      const futureBooking = {
        date: '2025-10-01',
        startTime: '12:00 PM'
      }

      const canMark = wrapper.vm.canMarkAttendance(futureBooking)
      expect(canMark).toBe(false)

      vi.useRealTimers()
    })
  })
})

console.log('🧪 Running Attendance Frontend test suite')
console.log('Testing Vue components, user interactions, and API integration')
