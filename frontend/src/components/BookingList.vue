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
              {{ booking.instructorName }}
            </div>
            <div class="booking-status" v-if="booking.status">
              <span :class="`status-${booking.status}`">
                {{ booking.status }}
              </span>
              <span v-if="booking.isRecurring" class="recurring-indicator">
                🔄 Recurring
              </span>
            </div>
          </div>

          <div v-if="showActions" class="booking-actions">
            <!-- Admin/Instructor actions -->
            <template v-if="userRole === 'admin' || userRole === 'instructor'">
              <button 
                v-if="booking.status !== 'cancelled' && !isPastBooking(booking)"
                @click="handleEditBooking(booking)"
                class="action-button action-button-primary"
              >
                Edit ›
              </button>
              <button 
                v-if="booking.status !== 'cancelled'"
                @click="handleCancelBooking(booking)"
                class="action-button action-button-secondary"
              >
                Cancel
              </button>
              <button 
                v-if="booking.status === 'cancelled'"
                @click="handleViewBooking(booking)"
                class="action-button action-button-secondary"
              >
                View ›
              </button>
            </template>
            
            <!-- Student actions -->
            <template v-else-if="userRole === 'student'">
              <button 
                v-if="booking.status !== 'cancelled' && !isPastBooking(booking) && canStudentReschedule(booking)"
                @click="handleEditBooking(booking)"
                class="action-button action-button-primary"
              >
                Reschedule ›
              </button>
              <button 
                v-else-if="booking.status !== 'cancelled' && !isPastBooking(booking)"
                class="action-button action-button-disabled"
                disabled
                title="Cannot reschedule within 24 hours of lesson"
              >
                Reschedule ›
              </button>
              
              <button 
                v-if="booking.status !== 'cancelled' && canStudentCancel(booking)"
                @click="handleCancelBooking(booking)"
                class="action-button action-button-secondary"
              >
                Cancel
              </button>
              <button 
                v-else-if="booking.status !== 'cancelled' && !isPastBooking(booking)"
                class="action-button action-button-disabled"
                disabled
                title="Cannot cancel within 24 hours of lesson"
              >
                Cancel
              </button>
              
              <button 
                @click="handleViewBooking(booking)"
                class="action-button action-button-secondary"
              >
                View ›
              </button>
            </template>
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
  emits: ['edit-booking', 'cancel-booking', 'view-booking'],
  setup(props, { emit }) {
    const filters = filterPresets.bookings
    const activeFilter = ref('upcoming')
    const currentPage = ref(1)
    const itemsPerPage = 25

    // Filter counts for tab badges
    const filterCounts = computed(() => {
      const now = new Date()
      now.setHours(0, 0, 0, 0) // Start of today
      
      const counts = {
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
      
      const filtered = props.bookings.filter(booking => {
        // Parse date correctly to avoid timezone issues
        const dateParts = booking.date.split('-') // ['2025', '08', '26']
        const bookingDate = new Date(
          parseInt(dateParts[0]), // year
          parseInt(dateParts[1]) - 1, // month (0-indexed)
          parseInt(dateParts[2]) // day
        )
        
        switch (activeFilter.value) {
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

.booking-actions {
  display: flex;
  gap: var(--spacing-xs);
  flex-shrink: 0;
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