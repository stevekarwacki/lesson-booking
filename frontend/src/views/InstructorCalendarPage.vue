<template>
    <div class="calendar-page">
        <div class="page-header">
            <h1>Manage Your Calendar</h1>
        </div>
        
        <!-- Instructor Bookings List -->
        <div v-if="instructor && instructor.id" class="bookings-section card">
            <div class="card-header">
                <h3>Your Bookings</h3>
            </div>
            <div class="card-body">
                <BookingList
                    :bookings="formattedBookings"
                    :loading="bookingsLoading"
                    :userId="userStore.user.id"
                    :userRole="'instructor'"
                    @edit-booking="handleEditBooking"
                    @cancel-booking="handleCancelBooking"
                    @view-booking="handleViewBooking"
                    @attendance-changed="handleAttendanceChanged"
                    @process-refund="handleRefundBooking"
                />
            </div>
        </div>

        <!-- Calendar Interface -->
        <InstructorCalendar 
            v-if="instructor && instructor.id" 
            :instructor="instructor" 
            @process-refund="handleRefundBooking"
        />

        <!-- Edit Booking Modal -->
        <EditBookingModal
            v-if="showEditModal"
            :booking="selectedBooking"
            @close="closeEditModal"
            @booking-updated="handleBookingUpdated"
            @booking-cancelled="handleBookingCancelled"
        />

        <!-- Refund Modal -->
        <RefundModal
            v-if="showRefundModal"
            :booking="selectedRefundBooking"
            @close="closeRefundModal"
            @refund-processed="handleRefundProcessed"
        />
    </div>
</template>

<script setup>
import InstructorCalendar from '../components/InstructorCalendar.vue'
import BookingList from '../components/BookingList.vue'
import EditBookingModal from '../components/EditBookingModal.vue'
import RefundModal from '../components/RefundModal.vue'
import { useUserStore } from '../stores/userStore'
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()
const instructor = ref(null)
const error = ref(null)
const loading = ref(false)
const bookings = ref([])
const bookingsLoading = ref(false)
const showEditModal = ref(false)
const showRefundModal = ref(false)
const selectedBooking = ref(null)
const selectedRefundBooking = ref(null)

const fetchInstructor = async () => {
    try {
        loading.value = true;
        error.value = null;
        
        const response = await fetch(`/api/instructors/user/${userStore.user.id}`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch instructor information');
        }
        
        const data = await response.json();
        instructor.value = data;
        
        // Fetch bookings after getting instructor info
        if (data.id) {
            await fetchBookings(data.id);
        }
    } catch (err) {
        error.value = 'Error fetching instructor information: ' + err.message;
        console.error('Error fetching instructor information:', err);
    } finally {
        loading.value = false;
    }
}

const fetchBookings = async (instructorId) => {
    try {
        bookingsLoading.value = true;
        
        const response = await fetch(`/api/calendar/instructor/${instructorId}`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch bookings');
        }
        
        const data = await response.json();
        bookings.value = data;
    } catch (err) {
        console.error('Error fetching bookings:', err);
        error.value = 'Error fetching bookings: ' + err.message;
    } finally {
        bookingsLoading.value = false;
    }
}

// Format bookings for BookingList component
const formattedBookings = computed(() => {
    return bookings.value.map(booking => ({
        id: booking.id,
        date: booking.date,
        startTime: formatTime(slotToTime(booking.start_slot)),
        endTime: formatTime(slotToTime(booking.start_slot + booking.duration)),
        instructorName: instructor.value?.name || 'You',
        studentName: booking.student?.name || 'No Student',
        status: booking.status || 'booked',
        isRecurring: false, // Add logic for recurring if needed
        attendance: booking.attendance, // Include attendance data from backend
        refundStatus: booking.refundStatus || { status: 'none' }, // Will be populated by backend
        // Original booking data for actions
        originalBooking: booking
    }));
});

// Helper function to format time (you may need to import this)
const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    
    return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

// Helper function to convert slot to time (you may need to import this)
const slotToTime = (slot) => {
    const MAX_SLOT_INDEX = 95;
    
    // Clamp slot to valid range
    let clampedSlot = slot;
    if (slot < 0) {
        clampedSlot = 0;
    } else if (slot > MAX_SLOT_INDEX) {
        clampedSlot = MAX_SLOT_INDEX;
    }
    
    const hours = Math.floor(clampedSlot / 4);
    const minutes = (clampedSlot % 4) * 15;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Modal management
const closeEditModal = () => {
    showEditModal.value = false;
    selectedBooking.value = null;
};

const handleBookingUpdated = async () => {
    closeEditModal();
    // Refresh bookings after update
    if (instructor.value?.id) {
        await fetchBookings(instructor.value.id);
    }
};

const handleBookingCancelled = async () => {
    closeEditModal();
    // Refresh bookings after cancellation
    if (instructor.value?.id) {
        await fetchBookings(instructor.value.id);
    }
};

// Event handlers
const handleEditBooking = (booking) => {
    selectedBooking.value = booking.originalBooking;
    showEditModal.value = true;
};

const handleCancelBooking = (booking) => {
    selectedBooking.value = booking.originalBooking;
    showEditModal.value = true;
};

const handleViewBooking = (booking) => {
    selectedBooking.value = booking.originalBooking;
    showEditModal.value = true;
};

const handleRefundBooking = (booking) => {
    selectedRefundBooking.value = booking.originalBooking || booking;
    showRefundModal.value = true;
};

const closeRefundModal = () => {
    showRefundModal.value = false;
    selectedRefundBooking.value = null;
};

const handleRefundProcessed = async (result) => {
    closeRefundModal();
    // Refresh bookings after refund
    if (instructor.value?.id) {
        await fetchBookings(instructor.value.id);
    }
};

const handleAttendanceChanged = async (booking, status, notes = '') => {
    try {
        const response = await fetch('/api/calendar/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify({
                eventId: booking.originalBooking.id,
                status: status,
                notes: notes
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update attendance');
        }

        const result = await response.json();
        
        // Update the booking in our local state
        const bookingIndex = bookings.value.findIndex(b => b.id === booking.originalBooking.id);
        if (bookingIndex !== -1) {
            bookings.value[bookingIndex].attendance = {
                status: result.attendance.status,
                notes: result.attendance.notes,
                recorded_at: result.attendance.recorded_at
            };
        }
        
        // Show success message (you might want to use a toast notification)
        // TODO: Add toast notification for attendance update success
        
    } catch (err) {
        console.error('Error updating attendance:', err);
        // Show error message (you might want to use a toast notification)
        alert('Error updating attendance: ' + err.message);
    }
};

onMounted(() => {
    if (!userStore.canManageCalendar) {
        router.push('/')
    } else {
        fetchInstructor()
    }
})
</script>

<style scoped>
.calendar-page {
    max-width: 1200px;
    margin: 0 auto;
}

.page-header {
    margin-bottom: var(--spacing-lg);
}

.page-header h1 {
    color: var(--secondary-color);
    font-size: 2rem;
    margin: 0;
}
</style> 