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
                :no-pagination="true"
                @tab-change="handleTabChange"
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
            cancel-text="Close"
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
import { useBookings } from '../composables/useBookings'
import { slotToTime, formatDate, formatTime } from '../utils/timeFormatting'
import BookingList from './BookingList.vue'
import EditBooking from './EditBooking.vue'
import RefundModal from './RefundModal.vue'
import { Modal } from '@/components/ui/modal'
import { useMq } from 'vue3-mq'

const userStore = useUserStore()
const todayStr = new Date().toISOString().split('T')[0]
const { 
    bookings, 
    isLoading: loading,
    setFilters,
    refetch: refetchBookings
} = useBookings({ initialFilters: { startDate: todayStr, endDate: todayStr } })

const showEditModal = ref(false)
const showRefundModal = ref(false)
const selectedBooking = ref(null)
const editBookingRef = ref(null)

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

// Bookings are fetched and scoped via useBookings composable

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

// Forward save event from Modal to EditBooking component
const handleEditBookingSave = () => {
    editBookingRef.value?.handleSave()
}

// BookingList event handlers
const handleTabChange = (tab) => {
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    switch (tab) {
        case 'today':
            setFilters({ startDate: today, endDate: today, status: null }); break
        case 'upcoming':
            setFilters({ startDate: tomorrow.toISOString().split('T')[0], endDate: null, status: null }); break
        case 'past':
            setFilters({ startDate: null, endDate: yesterday.toISOString().split('T')[0], status: null }); break
        case 'cancelled':
            setFilters({ startDate: null, endDate: null, status: 'cancelled' }); break
    }
}

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
</script>

<style scoped>
.user-bookings {
    margin-bottom: var(--spacing-lg);
}
</style> 