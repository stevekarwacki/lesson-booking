<template>
    <div class="calendar-page">
        <div class="page-header">
            <h1>Calendar</h1>
        </div>

        <!-- Admin Instructor Picker (only shown if multiple active instructors) -->
        <div v-if="showInstructorPicker" class="instructor-picker card">
            <div class="card-body">
                <SearchBar
                    v-model="instructorSearchQuery"
                    placeholder="Search instructors by name or email..."
                    :results="searchResults"
                    :show-results="isSearchFocused"
                    :min-chars="1"
                    @focus="isSearchFocused = true"
                    @blur="handleSearchBlur"
                    @select="handleInstructorSelect"
                >
                    <template #result="{ result }">
                        <div class="result-content">
                            <div class="result-primary">{{ result.name }}</div>
                            <div class="result-secondary">
                                {{ result.User?.email || result.email }}
                            </div>
                        </div>
                    </template>
                </SearchBar>
            </div>
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
import SearchBar from '../components/SearchBar.vue'
import { useUserStore } from '../stores/userStore'
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFormFeedback } from '../composables/useFormFeedback'

const userStore = useUserStore()
const router = useRouter()
const formFeedback = useFormFeedback()
const instructor = ref(null)
const error = ref(null)
const loading = ref(false)
const bookings = ref([])
const bookingsLoading = ref(false)
const showEditModal = ref(false)
const showRefundModal = ref(false)
const selectedBooking = ref(null)
const selectedRefundBooking = ref(null)

// Admin instructor picker state
const allInstructors = ref([])
const instructorSearchQuery = ref('')
const isSearchFocused = ref(false)

// Computed property to determine if we should show the instructor picker
const showInstructorPicker = computed(() => {
    return userStore.canManageUsers && allInstructors.value.length > 1
})

// Search results for instructor picker
const searchResults = computed(() => {
    if (!instructorSearchQuery.value || !allInstructors.value.length) {
        return allInstructors.value.slice(0, 10) // Show first 10 by default
    }
    
    const query = instructorSearchQuery.value.toLowerCase()
    return allInstructors.value.filter(instr => {
        const name = instr.name?.toLowerCase() || ''
        const email = instr.User?.email?.toLowerCase() || instr.email?.toLowerCase() || ''
        return name.includes(query) || email.includes(query)
    }).slice(0, 10)
})

const handleSearchBlur = () => {
    setTimeout(() => {
        isSearchFocused.value = false
    }, 200)
}

// Fetch all instructors (for admins)
const fetchAllInstructors = async () => {
    try {
        const response = await fetch('/api/instructors', {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (!response.ok) {
            throw new Error('Failed to fetch instructors')
        }
        
        const data = await response.json()
        // Filter to only active instructors
        allInstructors.value = data.filter(instr => instr.is_active)
        
        // If only one instructor, auto-select
        if (allInstructors.value.length === 1) {
            instructor.value = allInstructors.value[0]
            await fetchBookings(allInstructors.value[0].id)
        }
    } catch (err) {
        console.error('Error fetching instructors:', err)
        error.value = 'Error fetching instructors: ' + err.message
    }
}

// Handle instructor selection (for admins)
const handleInstructorSelect = async (selectedInstructor) => {
    if (selectedInstructor) {
        instructor.value = selectedInstructor
        instructorSearchQuery.value = '' // Clear search after selection
        isSearchFocused.value = false
        // Fetch bookings for the selected instructor
        if (selectedInstructor.id) {
            await fetchBookings(selectedInstructor.id)
        }
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
        paymentMethod: booking.paymentMethod, // From backend
        paymentStatus: booking.paymentStatus, // From backend
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
        
        // Show success toast
        formFeedback.showSuccess(`Attendance marked as ${status}`)
        
    } catch (err) {
        formFeedback.handleError(err, 'Failed to update attendance:')
    }
};

onMounted(async () => {
    // Check permissions - both instructors and admins can access
    if (!userStore.canManageCalendar && !userStore.canManageUsers) {
        router.push('/')
        return
    }
    
    // Admin flow: fetch all instructors and let them select
    if (userStore.canManageUsers) {
        await fetchAllInstructors()
    } 
    // Instructor flow: fetch their own instructor profile
    else if (userStore.canManageCalendar) {
        await fetchOwnInstructor()
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

.instructor-picker {
    margin-bottom: var(--spacing-lg);
}
</style> 