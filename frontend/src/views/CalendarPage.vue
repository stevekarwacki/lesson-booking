<template>
    <PageContainer class="calendar-page">
        <!-- Page header (all roles) -->
        <div class="page-header">
            <h1 v-if="pageTitle">{{ pageTitle }}</h1>
            <div v-else class="page-header-placeholder" aria-hidden="true" />
        </div>

        <!-- Today's Bookings — all roles -->
        <div class="bookings-section card">
            <div class="card-header">
                <h2 class="bookings-heading">Today's Bookings</h2>
            </div>
            <div class="card-body">
                <BookingList
                    :bookings="formattedBookings"
                    :loading="bookingsLoading"
                    :userId="userStore.user?.id"
                    :userRole="userStore.user?.role"
                    :filters="[{ label: 'Today', value: 'today' }]"
                    :no-pagination="true"
                    :show-bookings-link="true"
                    @edit-booking="handleEditBooking"
                    @cancel-booking="handleCancelBooking"
                    @view-booking="handleViewBooking"
                    @attendance-changed="handleAttendanceChanged"
                    @process-refund="handleRefundBooking"
                />
            </div>
        </div>

        <!-- Student + Admin: InstructorCalendar manages its own instructor search -->
        <div v-if="userStore.isStudent || userStore.canManageUsers" class="calendar-panel card">
            <InstructorCalendar
                week-start-day="current"
                @process-refund="handleRefundBooking"
                @instructor-changed="handleInstructorChanged"
            />
        </div>

        <!-- Instructor role: fixed profile, no search bar -->
        <div v-if="userStore.canManageCalendar && !userStore.canManageUsers && instructor?.id" class="calendar-panel card">
            <InstructorCalendar
                :instructor="instructor"
                week-start-day="current"
                @process-refund="handleRefundBooking"
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

        <!-- Refund Modal -->
        <RefundModal
            v-if="showRefundModal"
            :booking="selectedRefundBooking"
            @close="closeRefundModal"
            @refund-processed="handleRefundProcessed"
        />
    </PageContainer>
</template>

<script setup>
import { PageContainer } from '@/components/ui/page-container'
import InstructorCalendar from '../components/InstructorCalendar.vue'
import BookingList from '../components/BookingList.vue'
import EditBooking from '../components/EditBooking.vue'
import RefundModal from '../components/RefundModal.vue'
import { Modal } from '@/components/ui/modal'
import { useUserStore } from '../stores/userStore'
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFormFeedback } from '../composables/useFormFeedback'
import { useBookings } from '../composables/useBookings'

const userStore = useUserStore()
const router = useRouter()
const formFeedback = useFormFeedback()
const instructor = ref(null)
const error = ref(null)
const loading = ref(false)
const showEditModal = ref(false)
const showRefundModal = ref(false)
const selectedBooking = ref(null)
const selectedRefundBooking = ref(null)

// Booking list — server-scoped via useBookings; tab/instructor changes call setFilters
const todayStr = new Date().toISOString().split('T')[0]
const {
    bookings: rawBookings,
    isLoading: bookingsLoading,
    setFilters: setBookingFilters,
    refetch: refetchBookings
} = useBookings({ initialFilters: { startDate: todayStr, endDate: todayStr } })

// Page title — instructors use the auth store name synchronously so there is no flash on load;
// admins and students rely on the instructor ref which is set after selection.
const pageTitle = computed(() => {
    if (userStore.canManageCalendar && !userStore.canManageUsers) {
        const name = instructor.value?.User?.name ?? userStore.user?.name
        return name ? `${name}'s Calendar` : ''
    }
    const name = instructor.value?.User?.name
    return name ? `${name}'s Calendar` : ''
})

// Handles instructor selection from InstructorCalendar (student + admin paths)
const handleInstructorChanged = (instr) => {
    instructor.value = instr  // updates page title for students and admins
    if (instr?.id && userStore.canManageUsers) {
        setBookingFilters({ instructorId: instr.id })
    }
}

// Fetch own instructor profile (for instructors)
const fetchOwnInstructor = async () => {
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
        // useBookings is already scoped to this instructor server-side; no extra filter needed
    } catch (err) {
        error.value = 'Error fetching instructor information: ' + err.message;
        console.error('Error fetching instructor information:', err);
    } finally {
        loading.value = false;
    }
}

// Format bookings for BookingList component
const formattedBookings = computed(() => {
    return rawBookings.value.map(booking => ({
        id: booking.id,
        date: booking.date,
        startTime: formatTime(slotToTime(booking.start_slot)),
        endTime: formatTime(slotToTime(booking.start_slot + booking.duration)),
        instructorName: booking.instructor_name || booking.Instructor?.User?.name || instructor.value?.User?.name || '',
        studentName: booking.student?.name || 'No Student',
        status: booking.status || 'booked',
        isRecurring: false,
        attendance: booking.attendance,
        refundStatus: booking.refundStatus || { status: 'none' },
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
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
    await refetchBookings();
};

const handleBookingCancelled = async () => {
    closeEditModal();
    await refetchBookings();
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
    await refetchBookings();
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

        await response.json();
        await refetchBookings();
        formFeedback.showSuccess(`Attendance marked as ${status}`)
        
    } catch (err) {
        formFeedback.handleError(err, 'Failed to update attendance:')
    }
};

onMounted(async () => {
    // Students and admins: InstructorCalendar handles instructor fetching internally
    if (userStore.isStudent || userStore.canManageUsers) {
        return
    }

    // Instructor role: fetch own profile to pass as prop
    if (userStore.canManageCalendar) {
        await fetchOwnInstructor()
    }
    // No calendar access at all
    else {
        router.push('/')
    }
})
</script>

<style scoped>
.page-header {
    margin-bottom: var(--spacing-lg);
}

.page-header h1,
.page-header-placeholder {
    font-size: 2rem;
    margin: 0;
    line-height: 1.2;
    height: 1.2em;
}

.page-header h1 {
    color: var(--secondary-color);
}

.calendar-panel {
    padding: 0; /* inner zones handle their own padding */
    margin-bottom: var(--spacing-lg);
}

.bookings-section {
    margin-bottom: var(--spacing-lg);
}

.bookings-heading {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--secondary-color);
    margin: 0;
}
</style> 