<template>
    <PageContainer class="calendar-page">
        <!-- Page header (all roles) -->
        <div class="page-header">
            <h1 v-if="pageTitle">{{ pageTitle }}</h1>
            <div v-else class="page-header-placeholder" aria-hidden="true" />
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
                            <div class="result-primary">{{ result.User?.name }}</div>
                            <div class="result-secondary">
                                {{ result.User?.email || result.email }}
                            </div>
                        </div>
                    </template>
                </SearchBar>
            </div>
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

        <!-- Student: lesson booking calendar -->
        <LessonBooking v-if="userStore.isStudent" @instructor-selected="instructor = $event" />

        <!-- Instructor / Admin: weekly calendar -->
        <InstructorCalendar
            v-if="!userStore.isStudent && instructor?.id"
            :instructor="instructor"
            week-start-day="current"
            @process-refund="handleRefundBooking"
        />

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
import SearchBar from '../components/SearchBar.vue'
import LessonBooking from '../components/LessonBooking.vue'
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
        const name = (instr.User?.name || instr.name || '').toLowerCase()
        const email = (instr.User?.email || instr.email || '').toLowerCase()
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
        
        // If only one instructor, auto-select and scope bookings to them
        if (allInstructors.value.length === 1) {
            instructor.value = allInstructors.value[0]
            setBookingFilters({ instructorId: allInstructors.value[0].id })
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
        instructorSearchQuery.value = ''
        isSearchFocused.value = false
        if (selectedInstructor.id) {
            setBookingFilters({ instructorId: selectedInstructor.id })
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
    // Students: useBookings auto-fetches their own bookings; no instructor setup needed
    if (userStore.isStudent) {
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

.instructor-picker {
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