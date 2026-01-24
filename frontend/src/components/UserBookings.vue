<template>
    <div class="user-bookings card">
        <div class="card-header">
            <h2>Your Bookings</h2>
        </div>
        
        <div class="card-body">
            <BookingList
                :bookings="formattedBookings"
                :loading="loading"
                :userId="userStore.user.id"
                :userRole="userStore.user.role"
                @edit-booking="handleEditBookingFromList"
                @cancel-booking="handleCancelBookingFromList"
                @view-booking="handleViewBookingFromList"
                @process-refund="handleRefundBookingFromList"
            />
        </div>

        <!-- Edit Booking Modal -->
        <Modal
            v-model:open="showEditModal"
            title="Reschedule Lesson"
            hide-save
            hide-cancel
            @cancel="closeEditModal"
        >
            <EditBooking
                v-if="selectedBooking"
                :booking="selectedBooking"
                @close="closeEditModal"
                @booking-updated="handleBookingUpdated"
                @booking-cancelled="handleBookingCancelled"
            />
        </Modal>

        <RefundModal
            v-if="showRefundModal"
            :booking="selectedBooking"
            @close="closeRefundModal"
            @refund-processed="handleRefundProcessed"
        />
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useUserBookings } from '../composables/useUserBookings'
import { slotToTime, formatDate, formatTime } from '../utils/timeFormatting'
import BookingList from './BookingList.vue'
import EditBooking from './EditBooking.vue'
import RefundModal from './RefundModal.vue'
import { Modal } from '@/components/ui/modal'
import { useMq } from 'vue3-mq'

const userStore = useUserStore()
const { 
    bookings, 
    isLoading: loading,
    error: bookingsError,
    refetchBookings
} = useUserBookings(computed(() => userStore.user?.id))

const error = ref(null)
const showEditModal = ref(false)
const showRefundModal = ref(false)
const selectedBooking = ref(null)

// Transform bookings for BookingList component
const formattedBookings = computed(() => {
    if (!bookings.value) return []
    return bookings.value.map(booking => {
        return {
            id: booking.id,
            date: booking.date,
            startTime: formatTime(slotToTime(booking.start_slot)),
            endTime: formatTime(slotToTime(booking.start_slot + booking.duration)),
            instructorName: booking.Instructor.User.name,
            status: booking.status || 'booked',
            isRecurring: false,
            refundStatus: booking.refundStatus || { status: 'none' }, // Will be populated by backend
            paymentMethod: booking.paymentMethod, // From backend
            paymentStatus: booking.paymentStatus, // From backend
            // Original booking data for EditBookingModal
            originalBooking: booking
        }
    })
})

// Bookings are automatically fetched via useUserBookings composable

const openEditModal = (booking) => {
    selectedBooking.value = booking
    showEditModal.value = true
}

const closeEditModal = () => {
    showEditModal.value = false
    selectedBooking.value = null
}

const handleBookingUpdated = async () => {
    closeEditModal()
    await refetchBookings()
}

const handleBookingCancelled = async (result) => {
    closeEditModal()
    await refetchBookings()
}

// BookingList event handlers
const handleEditBookingFromList = (booking) => {
    selectedBooking.value = booking.originalBooking
    showEditModal.value = true
}

const handleCancelBookingFromList = (booking) => {
    selectedBooking.value = booking.originalBooking
    showEditModal.value = true
}

const handleViewBookingFromList = (booking) => {
    selectedBooking.value = booking.originalBooking
    showEditModal.value = true
}

const handleRefundBookingFromList = (booking) => {
    selectedBooking.value = booking.originalBooking  // This is for the RefundModal
    showRefundModal.value = true
}

const closeRefundModal = () => {
    showRefundModal.value = false
    selectedBooking.value = null
}

const handleRefundProcessed = async (result) => {
    closeRefundModal()
    await refetchBookings()
}

// Bookings are automatically fetched via useUserBookings composable
</script>

<style scoped>
.user-bookings {
    margin-bottom: var(--spacing-lg);
}
</style> 