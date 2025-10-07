<template>
  <div class="booking-list">
    <!-- Filter Tabs -->
    <FilterTabs
      :filters="filters"
      :activeFilter="activeFilter"
      :counts="filterCounts"
      @filter-change="handleFilterChange"
    />

    <!-- Bookings List -->
    <div v-if="filteredBookings.length > 0" class="bookings-container">
      <div class="bookings-list">
        <div 
          v-for="booking in paginatedBookings" 
          :key="booking.id" 
          class="booking-item"
          :class="{ 
            'booking-recurring': booking.isRecurring,
            'booking-cancelled': booking.status === 'cancelled'
          }"
        >
          <div class="booking-time">
            <div class="booking-date">
              {{ formatDate(booking.date) }}
            </div>
            <div class="booking-time-range">
              {{ formatTime(booking.startTime) }} - {{ formatTime(booking.endTime) }}
            </div>
          </div>
          
          <div class="booking-details">
            <div class="booking-instructor">
              {{ userRole === 'instructor' ? booking.studentName : booking.instructorName }}
            </div>
            <div class="booking-status" v-if="booking.status">
              <span :class="`status-${booking.status}`">
                {{ booking.status }}
              </span>
              <span v-if="booking.isRecurring" class="recurring-indicator">
                🔄 Recurring
              </span>
              <!-- Refund status display -->
              <span v-if="booking.refundStatus && booking.refundStatus.status !== 'none'" class="refund-indicator">
                💰 {{ booking.refundStatus.type === 'stripe' ? 'Refunded' : 'Credit Refunded' }}
              </span>
            </div>
            
            <!-- Attendance Status Display -->
            <div v-if="userRole === 'instructor' && booking.attendance" class="attendance-status">
              <span :class="`attendance-${booking.attendance.status}`">
                📋 {{ booking.attendance.status?.charAt(0).toUpperCase() + booking.attendance.status?.slice(1) }}
              </span>
              <span v-if="booking.attendance.notes" class="attendance-notes">
                ({{ booking.attendance.notes }})
              </span>
            </div>
            <div v-else-if="userRole === 'instructor' && isPastBooking(booking)" class="attendance-status">
              <span class="attendance-not-recorded">📋 Not Recorded</span>
            </div>
          </div>

          <div v-if="showActions" class="booking-actions">
            <!-- Attendance Controls for Instructors -->
            <div v-if="userRole === 'instructor' && canMarkAttendance(booking)" class="attendance-controls">
              <select 
                :value="booking.attendance?.status || ''"
                @change="handleAttendanceChange(booking, $event.target.value)"
                class="attendance-select"
              >
                <option value="">Mark Attendance</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="tardy">Tardy</option>
              </select>
            </div>
            
            <!-- Action buttons - always present to maintain consistent layout -->
            <div class="action-buttons">
              <!-- Admin/Instructor actions -->
              <template v-if="userRole === 'admin' || userRole === 'instructor'">
                <button 
                  @click="handleViewBooking(booking)"
                  class="action-button action-button-secondary"
                >
                  Reschedule ›
                </button>
                <!-- Refund button for admins and instructors -->
                <button 
                  v-if="canRefundBooking(booking)"
                  @click="handleRefundBooking(booking)"
                  class="action-button action-button-warning"
                  title="Process refund for this booking"
                >
                  Refund
                </button>
              </template>
              
              <!-- Student actions -->
              <template v-else-if="userRole === 'student'">
                <button 
                  @click="handleViewBooking(booking)"
                  class="action-button action-button-secondary"
                >
                  Reschedule ›
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination for past/cancelled bookings -->
      <div 
        v-if="showPagination" 
        class="pagination-controls"
      >
        <button 
          @click="goToPreviousPage"
          :disabled="currentPage === 1"
          class="pagination-button"
        >
          ‹ Previous
        </button>
        
        <span class="pagination-info">
          Page {{ currentPage }} of {{ totalPages }}
          ({{ totalBookings }} total)
        </span>
        
        <button 
          @click="goToNextPage"
          :disabled="currentPage === totalPages"
          class="pagination-button"
        >
          Next ›
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <p>No {{ activeFilter }} bookings found.</p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <p>Loading bookings...</p>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import FilterTabs from './FilterTabs.vue'
import { filterPresets } from '../composables/useFiltering.js'

export default {
  name: 'BookingList',
  components: {
    FilterTabs
  },
  props: {
    bookings: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    userId: {
      type: Number,
      required: true
    },
    userRole: {
      type: String,
      default: 'student', // 'student', 'instructor', 'admin'
      validator: (value) => ['student', 'instructor', 'admin'].includes(value)
    },
    showActions: {
      type: Boolean,
      default: true
    }
  },
  emits: ['edit-booking', 'cancel-booking', 'view-booking', 'attendance-changed', 'process-refund'],
  setup(props, { emit }) {
    const filters = filterPresets.bookings
    const activeFilter = ref('today')
    const currentPage = ref(1)
    const itemsPerPage = 25

    // Filter counts for tab badges
    const filterCounts = computed(() => {
      const now = new Date()
      now.setHours(0, 0, 0, 0) // Start of today
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const counts = {
        today: 0,
        upcoming: 0,
        past: 0,
        cancelled: 0
      }

      props.bookings.forEach(booking => {
        // Parse date correctly to avoid timezone issues
        const dateParts = booking.date.split('-')
        const bookingDate = new Date(
          parseInt(dateParts[0]), // year
          parseInt(dateParts[1]) - 1, // month (0-indexed)
          parseInt(dateParts[2]) // day
        )
        
        if (booking.status === 'cancelled') {
          counts.cancelled++
        } else if (bookingDate >= now && bookingDate < tomorrow) {
          counts.today++
        } else if (bookingDate >= now) {
          counts.upcoming++
        } else {
          counts.past++
        }
      })

      return counts
    })

    // Filter bookings based on active filter
    const filteredBookings = computed(() => {
      const now = new Date()
      now.setHours(0, 0, 0, 0) // Start of today for fair comparison
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const filtered = props.bookings.filter(booking => {
        // Parse date correctly to avoid timezone issues
        const dateParts = booking.date.split('-') // ['2025', '08', '26']
        const bookingDate = new Date(
          parseInt(dateParts[0]), // year
          parseInt(dateParts[1]) - 1, // month (0-indexed)
          parseInt(dateParts[2]) // day
        )
        
        switch (activeFilter.value) {
          case 'today':
            return booking.status !== 'cancelled' && bookingDate >= now && bookingDate < tomorrow
          case 'upcoming':
            return booking.status !== 'cancelled' && bookingDate >= now
          case 'past':
            return booking.status !== 'cancelled' && bookingDate < now
          case 'cancelled':
            return booking.status === 'cancelled'
          default:
            return true
        }
      }).sort((a, b) => {
        // Sort upcoming by date ascending, past by date descending
        // Parse dates correctly to avoid timezone issues
        const parseDate = (dateStr) => {
          const parts = dateStr.split('-')
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        }
        
        const dateA = parseDate(a.date)
        const dateB = parseDate(b.date)
        
        if (activeFilter.value === 'upcoming') {
          return dateA - dateB
        } else {
          return dateB - dateA
        }
      })
      
      return filtered
    })

    // Pagination
    const totalBookings = computed(() => filteredBookings.value.length)
    const totalPages = computed(() => Math.ceil(totalBookings.value / itemsPerPage))
    
    const showPagination = computed(() => {
      return (activeFilter.value === 'past' || activeFilter.value === 'cancelled') && 
             totalBookings.value > itemsPerPage
    })

    const paginatedBookings = computed(() => {
      if (!showPagination.value) {
        return filteredBookings.value
      }
      
      const start = (currentPage.value - 1) * itemsPerPage
      const end = start + itemsPerPage
      return filteredBookings.value.slice(start, end)
    })

    // Helper functions
    const formatDate = (date) => {
      // Parse date correctly to avoid timezone issues
      const dateParts = date.split('-')
      const parsedDate = new Date(
        parseInt(dateParts[0]), // year
        parseInt(dateParts[1]) - 1, // month (0-indexed)
        parseInt(dateParts[2]) // day
      )
      
      return parsedDate.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }

    const formatTime = (timeString) => {
      // Assumes timeString is in format "HH:MM"
      const [hours, minutes] = timeString.split(':')
      const date = new Date()
      date.setHours(parseInt(hours), parseInt(minutes))
      
      return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }

    const isPastBooking = (booking) => {
      // Parse date correctly to avoid timezone issues
      const dateParts = booking.date.split('-')
      const bookingDate = new Date(
        parseInt(dateParts[0]), // year
        parseInt(dateParts[1]) - 1, // month (0-indexed)
        parseInt(dateParts[2]) // day
      )
      
      const now = new Date()
      now.setHours(0, 0, 0, 0) // Start of today for fair comparison
      
      return bookingDate < now
    }

    // Student permission helpers
    const canStudentReschedule = (booking) => {
      // Students can reschedule up to 24 hours before the lesson
      // Parse date correctly to avoid timezone issues
      const dateParts = booking.date.split('-')
      const lessonTime = new Date(
        parseInt(dateParts[0]), // year
        parseInt(dateParts[1]) - 1, // month (0-indexed)
        parseInt(dateParts[2]) // day
      )
      const now = new Date()
      const hoursUntilLesson = (lessonTime - now) / (1000 * 60 * 60)
      return hoursUntilLesson >= 24
    }

    const canStudentCancel = (booking) => {
      // Students can cancel up to 24 hours before the lesson
      // Parse date correctly to avoid timezone issues
      const dateParts = booking.date.split('-')
      const lessonTime = new Date(
        parseInt(dateParts[0]), // year
        parseInt(dateParts[1]) - 1, // month (0-indexed)
        parseInt(dateParts[2]) // day
      )
      const now = new Date()
      const hoursUntilLesson = (lessonTime - now) / (1000 * 60 * 60)
      return hoursUntilLesson >= 24
    }

    // Event handlers
    const handleFilterChange = (filterValue) => {
      activeFilter.value = filterValue
      currentPage.value = 1 // Reset to first page when filter changes
    }

    const handleEditBooking = (booking) => {
      emit('edit-booking', booking)
    }

    const handleCancelBooking = (booking) => {
      emit('cancel-booking', booking)
    }

    const handleViewBooking = (booking) => {
      emit('view-booking', booking)
    }

    const handleAttendanceChange = (booking, status) => {
      if (status) {
        emit('attendance-changed', booking, status)
      }
    }

    const handleRefundBooking = (booking) => {
      emit('process-refund', booking)
    }

    // Permission check for refund button visibility
    const canRefundBooking = (booking) => {
      // Only show refund button for non-cancelled bookings that haven't been refunded
      if (booking.status === 'cancelled' || (booking.refundStatus && booking.refundStatus.status !== 'none')) {
        return false
      }
      
      // Admins can refund any booking
      if (props.userRole === 'admin') {
        return true
      }
      
      // Instructors can refund bookings for their students
      if (props.userRole === 'instructor') {
        // This would need to check if the booking belongs to this instructor
        // For now, we'll show the button and let the backend handle permission checks
        return true
      }
      
      return false
    }

    const canMarkAttendance = (booking) => {
      // Can mark attendance if lesson has started (for current/past bookings)
      const now = new Date()
      const lessonDate = new Date(booking.date)
      
      // Parse the start time to get the actual lesson datetime
      const [hours, minutes] = booking.startTime.split(':')
      const period = booking.startTime.includes('PM') ? 'PM' : 'AM'
      let hour24 = parseInt(hours)
      
      if (period === 'PM' && hour24 !== 12) {
        hour24 += 12
      } else if (period === 'AM' && hour24 === 12) {
        hour24 = 0
      }
      
      lessonDate.setHours(hour24, parseInt(minutes.replace(/\D/g, '')), 0, 0)
      
      // Allow attendance marking if lesson has started
      return now >= lessonDate
    }

    const goToPreviousPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--
      }
    }

    const goToNextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++
      }
    }

    return {
      filters,
      activeFilter,
      filterCounts,
      filteredBookings,
      paginatedBookings,
      totalBookings,
      totalPages,
      currentPage,
      showPagination,
      formatDate,
      formatTime,
      isPastBooking,
      canStudentReschedule,
      canStudentCancel,
      handleFilterChange,
      handleEditBooking,
      handleCancelBooking,
      handleViewBooking,
      handleAttendanceChange,
      handleRefundBooking,
      canRefundBooking,
      canMarkAttendance,
      goToPreviousPage,
      goToNextPage
    }
  }
}
</script>

<style scoped>
.booking-list {
  width: 100%;
}

.bookings-container {
  margin-top: var(--spacing-md);
}

.bookings-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.booking-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm);
  background: var(--background-light);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  transition: background-color 0.2s ease;
}

.booking-item:hover {
  background: var(--background-hover);
}

.booking-item.booking-recurring {
  border-left: 4px solid var(--color-primary);
}

.booking-item.booking-cancelled {
  opacity: 0.7;
  background: var(--background-muted);
}

.booking-time {
  flex: 1;
  min-width: 0;
}

.booking-date {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.booking-time-range {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.booking-details {
  flex: 2;
  min-width: 0;
  padding: 0 var(--spacing-md);
}

.booking-instructor {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.booking-status {
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.status-booked {
  color: var(--color-success);
}

.status-cancelled {
  color: var(--color-error);
}

.recurring-indicator {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.refund-indicator {
  background: #059669;
  color: white;
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
  margin-left: var(--spacing-xs);
}

.booking-actions {
  display: flex;
  flex-direction: row;
  gap: var(--spacing-xs);
  flex-shrink: 0;
  min-width: 300px;
  justify-content: end;
}

.action-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.action-button {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: white;
  color: var(--text-primary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all 0.2s ease;
}

.action-button:hover {
  background: var(--background-hover);
}

.action-button-primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.action-button-primary:hover {
  background: var(--color-primary-dark);
}

.action-button-secondary {
  color: var(--text-secondary);
}

.action-button-secondary:hover {
  background: var(--background-light);
}

.action-button-warning {
  color: #dc2626;
  border-color: #dc2626;
}

.action-button-warning:hover {
  background: #dc2626;
  color: white;
}

.action-button-disabled {
  background: var(--background-light) !important;
  color: var(--text-secondary) !important;
  border-color: var(--border-color) !important;
  cursor: not-allowed !important;
  opacity: 0.5;
}

.action-button-disabled:hover {
  background: var(--background-light) !important;
}

/* Attendance Styles */
.attendance-status {
  font-size: var(--font-size-sm);
  margin-top: 4px;
}

.attendance-present {
  color: var(--color-success);
}

.attendance-absent {
  color: var(--color-error);
}

.attendance-tardy {
  color: var(--color-warning, #f59e0b);
}

.attendance-not-recorded {
  color: var(--text-secondary);
  font-style: italic;
}

.attendance-notes {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.attendance-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.attendance-select {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: white;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.attendance-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.pagination-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--background-light);
  border-radius: var(--border-radius);
}

.pagination-button {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: white;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-button:hover:not(:disabled) {
  background: var(--background-hover);
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.empty-state,
.loading-state {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--text-secondary);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .booking-item {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
  }

  .booking-details {
    padding: 0;
  }

  .booking-actions {
    justify-content: flex-end;
  }

  .pagination-controls {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
}
</style>