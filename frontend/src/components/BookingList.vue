<template>
  <div class="booking-list">
    <!-- Filter Tabs -->
    <FilterTabs
      :filters="filters"
      :activeFilter="activeFilter"
      :counts="{}"
      :show-counts="false"
      @filter-change="handleFilterChange"
    />

    <!-- Bookings List -->
    <div v-if="bookings.length > 0" class="bookings-container">
      <div class="bookings-list">
        <div 
          v-for="booking in bookings" 
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

            <!-- Payment Status Display -->
            <div v-if="booking.paymentMethod === 'in-person'" class="payment-status-display">
              <span class="payment-method-badge">In-Person Payment</span>
              <span 
                class="payment-status-badge" 
                :class="`payment-status-${booking.paymentStatus}`"
                :style="{ color: getPaymentStatusColor(booking) }"
              >
                {{ formatPaymentStatus(booking.paymentStatus) }}
              </span>
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

            <!-- Payment Status Controls for Instructors -->
            <div v-if="(userRole === 'instructor' || userRole === 'admin') && booking.paymentMethod === 'in-person' && booking.paymentStatus === 'outstanding' && (!booking.refundStatus || booking.refundStatus.status === 'none')" class="payment-controls">
              <Button 
                @click="handlePaymentStatusUpdate(booking, 'completed')"
                size="sm"
                :disabled="updatingPayment === booking.id"
              >
                {{ updatingPayment === booking.id ? 'Updating...' : 'Mark as Paid' }}
              </Button>
            </div>
            
            <!-- Action buttons - always present to maintain consistent layout -->
            <div class="action-buttons">
              <!-- Admin/Instructor actions -->
              <template v-if="userRole === 'admin' || userRole === 'instructor'">
                <Button 
                  @click="handleEditBooking(booking)"
                  variant="outline"
                  size="sm"
                >
                  Reschedule ›
                </Button>
                <!-- Refund button for admins and instructors -->
                <Button 
                  v-if="canRefundBooking(booking)"
                  @click="handleRefundBooking(booking)"
                  variant="destructive"
                  size="sm"
                  title="Process refund for this booking"
                >
                  Refund
                </Button>
              </template>
              
              <!-- Student actions -->
              <template v-else-if="userRole === 'student'">
                <Button 
                  @click="handleEditBooking(booking)"
                  variant="outline"
                  size="sm"
                >
                  Reschedule ›
                </Button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination controls -->
      <div v-if="showPagination" class="pagination-controls">
        <Button 
          @click="$emit('page-change', currentPage - 1)"
          :disabled="currentPage === 1"
          variant="outline"
          size="sm"
        >
          ‹ Previous
        </Button>
        
        <span class="pagination-info">
          <template v-if="totalPages != null">
            Page {{ currentPage }} of {{ totalPages }}
          </template>
          <template v-else>
            Page {{ currentPage }}
          </template>
        </span>
        
        <Button 
          @click="$emit('page-change', currentPage + 1)"
          :disabled="totalPages != null && currentPage === totalPages"
          variant="outline"
          size="sm"
        >
          Next ›
        </Button>
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
import { useCalendar } from '../composables/useCalendar.js'
import { getPaymentStatusColor, formatPaymentStatus } from '../utils/paymentUtils'
import { useUserStore } from '../stores/userStore'
import { fromString, today, createDateHelper } from '../utils/dateHelpers.js'
import { Button } from '@/components/ui/button'

export default {
  name: 'BookingList',
  components: {
    FilterTabs,
    Button
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
      default: 'student',
      validator: (value) => ['student', 'instructor', 'admin'].includes(value)
    },
    showActions: {
      type: Boolean,
      default: true
    },
    currentPage: {
      type: Number,
      default: 1
    },
    totalBookings: {
      type: Number,
      default: null
    },
    pageSize: {
      type: Number,
      default: 20
    },
    noPagination: {
      type: Boolean,
      default: false
    }
  },
  emits: ['edit-booking', 'cancel-booking', 'view-booking', 'attendance-changed', 'process-refund', 'payment-status-changed', 'page-change', 'tab-change'],
  setup(props, { emit }) {
    const filters = filterPresets.bookings
    const activeFilter = ref('today')

    // Initialize calendar composable for payment status updates
    const { updatePaymentStatus } = useCalendar()

    // Pagination
    const totalPages = computed(() => {
      if (props.totalBookings != null) {
        return Math.ceil(props.totalBookings / props.pageSize)
      }
      return null
    })

    const showPagination = computed(() => {
      if (props.noPagination) return false
      if (totalPages.value != null) return totalPages.value > 1
      // No totalBookings provided — show controls so user can navigate freely
      return true
    })

    // Helper functions
    const formatDate = (dateStr) => {
      return fromString(dateStr).toDate().toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }

    const formatTime = (timeString) => {
      const [hours, minutes] = timeString.split(':')
      const dateHelper = today()
      const timeDate = dateHelper.toDate()
      timeDate.setHours(parseInt(hours), parseInt(minutes))
      return timeDate.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }

    const isPastBooking = (booking) => {
      return fromString(booking.date).isPast()
    }

    const canStudentReschedule = (booking) => {
      const bookingHelper = fromString(booking.date)
      const nowHelper = today()
      return nowHelper.diffInHours(bookingHelper) >= 24
    }

    const canStudentCancel = (booking) => {
      const bookingHelper = fromString(booking.date)
      const nowHelper = today()
      return nowHelper.diffInHours(bookingHelper) >= 24
    }

    // Event handlers
    const handleFilterChange = (filterValue) => {
      activeFilter.value = filterValue
      emit('tab-change', filterValue)
    }

    const handleEditBooking = (booking) => emit('edit-booking', booking)
    const handleCancelBooking = (booking) => emit('cancel-booking', booking)
    const handleViewBooking = (booking) => emit('view-booking', booking)

    const handleAttendanceChange = (booking, status) => {
      if (status) emit('attendance-changed', booking, status)
    }

    const handleRefundBooking = (booking) => emit('process-refund', booking)

    const canRefundBooking = (booking) => {
      if (booking.status === 'cancelled' || (booking.refundStatus && booking.refundStatus.status !== 'none')) {
        return false
      }
      return props.userRole === 'admin' || props.userRole === 'instructor'
    }

    const canMarkAttendance = (booking) => {
      const nowHelper = createDateHelper()
      const lessonHelper = fromString(booking.date)
      const [hours, minutes] = booking.startTime.split(':')
      const period = booking.startTime.includes('PM') ? 'PM' : 'AM'
      let hour24 = parseInt(hours)
      if (period === 'PM' && hour24 !== 12) hour24 += 12
      else if (period === 'AM' && hour24 === 12) hour24 = 0
      const lessonDateTime = lessonHelper.addHours(hour24).addMinutes(parseInt(minutes.replace(/\D/g, '')))
      return nowHelper.toTimestamp() >= lessonDateTime.toTimestamp()
    }

    // Payment status handling
    const userStore = useUserStore()
    const updatingPayment = ref(null)

    const handlePaymentStatusUpdate = async (booking, newStatus) => {
      try {
        updatingPayment.value = booking.id
        await updatePaymentStatus({ bookingId: booking.id, status: newStatus })
        booking.paymentStatus = newStatus
        emit('payment-status-changed', booking, newStatus)
      } catch (error) {
        console.error('Error updating payment status:', error)
        alert('Failed to update payment status: ' + error.message)
      } finally {
        updatingPayment.value = null
      }
    }

    return {
      filters,
      activeFilter,
      totalPages,
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
      getPaymentStatusColor,
      formatPaymentStatus,
      handlePaymentStatusUpdate,
      updatingPayment
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

.payment-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
}

.payment-status-display {
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
  margin-top: var(--spacing-xs);
  flex-wrap: wrap;
}

.payment-method-badge {
  font-size: 0.8rem;
  padding: 2px 6px;
  border-radius: 10px;
  background-color: #fff3e0;
  color: #f57c00;
  font-weight: 500;
}

.payment-status-badge {
  font-size: 0.8rem;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.payment-status-outstanding {
  background-color: #fff8e1;
}

.payment-status-completed {
  background-color: #e8f5e8;
}

.payment-received-btn {
  font-size: 0.85rem;
  padding: 4px 12px;
}

.action-button-success {
  background-color: #4caf50;
  color: white;
  border: none;
}

.action-button-success:hover:not(:disabled) {
  background-color: #45a049;
}

.action-button-success:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
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