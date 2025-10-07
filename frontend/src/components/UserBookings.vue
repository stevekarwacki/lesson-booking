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

        <EditBookingModal
            v-if="showEditModal"
            :booking="selectedBooking"
            @close="closeEditModal"
            @booking-updated="handleBookingUpdated"
            @booking-cancelled="handleBookingCancelled"
        />

        <RefundModal
            v-if="showRefundModal"
            :booking="selectedBooking"
            @close="closeRefundModal"
            @refund-processed="handleRefundProcessed"
        />
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { slotToTime, formatDate, formatTime } from '../utils/timeFormatting'
import BookingList from './BookingList.vue'
import EditBookingModal from './EditBookingModal.vue'
import RefundModal from './RefundModal.vue'
import { useMq } from 'vue3-mq'

const userStore = useUserStore()
const bookings = ref([])
const loading = ref(true)
const error = ref(null)
const showEditModal = ref(false)
const showRefundModal = ref(false)
const selectedBooking = ref(null)

// Transform bookings for BookingList component
const formattedBookings = computed(() => {
    return bookings.value.map(booking => ({
        id: booking.id,
        date: booking.date,
        startTime: formatTime(slotToTime(booking.start_slot)),
        endTime: formatTime(slotToTime(booking.start_slot + booking.duration)),
        instructorName: booking.Instructor.User.name,
        status: booking.status || 'booked',
        isRecurring: false,
        refundStatus: booking.refundStatus || { status: 'none' }, // Will be populated by backend
        // Original booking data for EditBookingModal
        originalBooking: booking
    }))
})

const fetchBookings = async () => {
    try {
        loading.value = true
        error.value = null
        
        const response = await fetch(`/api/calendar/student/${userStore.user.id}?includeAll=true`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (!response.ok) {
            throw new Error('Failed to fetch bookings')
        }
        
        const data = await response.json()
        bookings.value = data
    } catch (err) {
        error.value = 'Error fetching bookings: ' + err.message
        console.error('Error fetching bookings:', err)
    } finally {
        loading.value = false
    }
}

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
    await fetchBookings()
}

const handleBookingCancelled = async (result) => {
    closeEditModal()
    await fetchBookings()
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
    await fetchBookings()
}

onMounted(async () => {
    await fetchBookings()
})
</script>

<style scoped>
.user-bookings {
    margin-bottom: var(--spacing-lg);
}
</style> 