<script setup>
import { ref, computed, watch } from 'vue'
import { PageContainer } from '@/components/ui/page-container'
import { Modal } from '@/components/ui/modal'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import BookingList from '../components/BookingList.vue'
import EditBooking from '../components/EditBooking.vue'
import RefundModal from '../components/RefundModal.vue'
import SearchBar from '../components/SearchBar.vue'
import { useUserStore } from '../stores/userStore'
import { useInstructorBookings } from '../composables/useInstructorBookings'
import { useAdminBookings } from '../composables/useAdminBookings'
import { useStudentBookings } from '../composables/useStudentBookings'
import { useStudents } from '../composables/useStudents'
import { useInstructor } from '../composables/useInstructor'
import { slotToTime, formatTime } from '../utils/timeFormatting'
import { fetchInstructors as fetchInstructorsHelper } from '../utils/fetchHelper'

const userStore = useUserStore()

// Initial filter scope: "Today" tab (matches BookingList's default active tab)
const todayStr = new Date().toISOString().split('T')[0]
const todayInitialFilters = { startDate: todayStr, endDate: todayStr, status: null }

// ---------------------------------------------------------------------------
// Data sources — each composable is gated to its own role via enabled flag
// ---------------------------------------------------------------------------

// Student: paginated own bookings via the student endpoint
const studentId = computed(() => userStore.isStudent ? userStore.user?.id : null)
const {
    bookings: studentBookings,
    totalPages: studentTotalPages,
    currentPage: studentCurrentPage,
    isLoading: isLoadingStudent,
    setFilters: setStudentFilters,
    setPage: setStudentPage
} = useStudentBookings(studentId, {
    enabled: computed(() => userStore.isStudent && !!studentId.value),
    initialFilters: todayInitialFilters
})
// Instructor: paginated own bookings; supports student + date sub-filters
const ownInstructor = useInstructor({
    mode: 'self',
    enabled: computed(() => userStore.isInstructor)
})
const selfInstructorId = computed(() => ownInstructor.instructor.value?.id ?? null)
const {
    bookings: instructorBookings,
    totalPages: instructorTotalPages,
    currentPage: instructorCurrentPage,
    isLoading: isLoadingInstructor,
    setFilters: setInstructorFilters,
    setPage: setInstructorPage
} = useInstructorBookings(selfInstructorId, {
    enabled: computed(() => userStore.isInstructor),
    initialFilters: todayInitialFilters
})

// Admin: paginated all-bookings with full filter support
const {
    bookings: adminBookings,
    totalPages: adminTotalPages,
    currentPage: adminCurrentPage,
    isLoading: isLoadingAdmin,
    setFilters: setAdminFilters,
    setPage: setAdminPage
} = useAdminBookings({
    enabled: computed(() => userStore.isAdmin),
    initialFilters: todayInitialFilters
})

// ---------------------------------------------------------------------------
// Unified role-dispatch computed values
// ---------------------------------------------------------------------------
const isLoading = computed(() => {
    if (userStore.isStudent) return isLoadingStudent.value
    if (userStore.isInstructor) return isLoadingInstructor.value
    return isLoadingAdmin.value
})

const activeBookings = computed(() => {
    if (userStore.isStudent) return studentBookings.value
    if (userStore.isInstructor) return instructorBookings.value
    return adminBookings.value
})

const activeTotalPages = computed(() => {
    if (userStore.isStudent) return studentTotalPages.value
    if (userStore.isInstructor) return instructorTotalPages.value
    return adminTotalPages.value
})

const activeCurrentPage = computed(() => {
    if (userStore.isStudent) return studentCurrentPage.value
    if (userStore.isInstructor) return instructorCurrentPage.value
    return adminCurrentPage.value
})

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------
const filters = ref({
    instructorId: null,
    studentId: null,
    startDate: null,
    endDate: null
})

// Students list for instructor + admin filters
const { students } = useStudents(computed(() => userStore.isInstructor || userStore.isAdmin))
const studentSearchQuery = ref('')
const isStudentSearchFocused = ref(false)
const selectedStudentName = ref('')

const studentSearchResults = computed(() => {
    if (!students.value) return []
    const q = studentSearchQuery.value.toLowerCase()
    return students.value
        .filter(s => s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q))
        .slice(0, 10)
})

// Instructors list — admin uses API; students see instructors from current page
const allInstructors = ref([])
const instructorSearchQuery = ref('')
const isInstructorSearchFocused = ref(false)
const selectedInstructorName = ref('')

const instructorSearchResults = computed(() => {
    const q = instructorSearchQuery.value.toLowerCase()
    return allInstructors.value
        .filter(i => i.name?.toLowerCase().includes(q) || (i.User?.email || i.email)?.toLowerCase().includes(q))
        .slice(0, 10)
})

// For student role: derive unique instructors from whatever is loaded on the current page
const studentBookingInstructors = computed(() => {
    const seen = new Map()
    for (const b of studentBookings.value ?? []) {
        const id = b.instructor_id
        const name = b.instructor_name || ''
        if (id && !seen.has(id)) seen.set(id, { id, name })
    }
    return [...seen.values()]
})

if (userStore.isAdmin) {
    fetchInstructorsHelper(userStore.token)
        .then(r => { allInstructors.value = r.instructors.filter(i => i.is_active) })
        .catch(() => {})
}

// ---------------------------------------------------------------------------
// Push filter changes to the active composable
// ---------------------------------------------------------------------------
watch(filters, (f) => {
    const payload = {
        instructorId: f.instructorId || null,
        studentId: f.studentId || null,
        startDate: f.startDate || null,
        endDate: f.endDate || null
    }
    if (userStore.isAdmin) {
        setAdminFilters(payload)
    } else if (userStore.isInstructor) {
        setInstructorFilters({
            studentId: payload.studentId,
            startDate: payload.startDate,
            endDate: payload.endDate
        })
    } else if (userStore.isStudent) {
        // Student endpoint supports date range; instructor is filtered client-side
        setStudentFilters({
            startDate: payload.startDate,
            endDate: payload.endDate
        })
    }
}, { deep: true })

// ---------------------------------------------------------------------------
// Format raw bookings to the shape BookingList expects
// ---------------------------------------------------------------------------
function formatBooking(b) {
    const startSlot = b.start_slot ?? 0
    return {
        id: b.id,
        date: b.date,
        startTime: formatTime(slotToTime(startSlot)),
        endTime: formatTime(slotToTime(startSlot + (b.duration ?? 0))),
        instructorName: b.instructor_name || b.Instructor?.User?.name || '',
        studentName: b.student?.name || b.studentName || '',
        status: b.status || 'booked',
        isRecurring: b.isRecurring || false,
        attendance: b.attendance || null,
        refundStatus: b.refundStatus || { status: 'none' },
        paymentMethod: b.paymentMethod || null,
        paymentStatus: b.paymentStatus || null,
        originalBooking: b
    }
}

const filteredBookings = computed(() => {
    let list = (activeBookings.value ?? []).map(formatBooking)
    // Student instructor filter is applied client-side (student endpoint doesn't support instructorId filter)
    if (userStore.isStudent && filters.value.instructorId) {
        list = list.filter(b => b.originalBooking?.instructor_id === filters.value.instructorId)
    }
    return list
})

// ---------------------------------------------------------------------------
// Tab → server filter mapping
// ---------------------------------------------------------------------------
function tabToServerFilters(tab) {
    const todayStr = new Date().toISOString().split('T')[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    switch (tab) {
        case 'today':
            return { startDate: todayStr, endDate: todayStr, status: null }
        case 'upcoming':
            return { startDate: tomorrowStr, endDate: null, status: null }
        case 'past':
            return { startDate: null, endDate: yesterdayStr, status: null }
        case 'cancelled':
            return { startDate: null, endDate: null, status: 'cancelled' }
        default:
            return { startDate: null, endDate: null, status: null }
    }
}

function handleTabChange(tab) {
    const tabFilters = tabToServerFilters(tab)
    if (userStore.isStudent) {
        setStudentFilters(tabFilters)
    } else if (userStore.isInstructor) {
        setInstructorFilters(tabFilters)
    } else {
        setAdminFilters({ ...tabFilters, instructorId: filters.value.instructorId, studentId: filters.value.studentId })
    }
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
function handlePageChange(page) {
    if (userStore.isStudent) setStudentPage(page)
    else if (userStore.isInstructor) setInstructorPage(page)
    else setAdminPage(page)
}

// ---------------------------------------------------------------------------
// Search handlers
// ---------------------------------------------------------------------------
function handleStudentSelect(student) {
    filters.value.studentId = student.id
    selectedStudentName.value = student.name
    studentSearchQuery.value = ''
    isStudentSearchFocused.value = false
}
function handleStudentSearchBlur() {
    setTimeout(() => { isStudentSearchFocused.value = false }, 200)
}
function clearStudentFilter() {
    filters.value.studentId = null
    selectedStudentName.value = ''
    studentSearchQuery.value = ''
}

function handleInstructorSelect(instructor) {
    filters.value.instructorId = instructor.id
    selectedInstructorName.value = instructor.name
    instructorSearchQuery.value = ''
    isInstructorSearchFocused.value = false
}
function handleInstructorSearchBlur() {
    setTimeout(() => { isInstructorSearchFocused.value = false }, 200)
}
function clearInstructorFilter() {
    filters.value.instructorId = null
    selectedInstructorName.value = ''
    instructorSearchQuery.value = ''
}

function clearAllFilters() {
    filters.value = { instructorId: null, studentId: null, startDate: null, endDate: null }
    selectedStudentName.value = ''
    selectedInstructorName.value = ''
    studentSearchQuery.value = ''
    instructorSearchQuery.value = ''
}

// ---------------------------------------------------------------------------
// Modal state
// ---------------------------------------------------------------------------
const showEditModal = ref(false)
const showRefundModal = ref(false)
const selectedBooking = ref(null)
const selectedRefundBooking = ref(null)

function handleEditBooking(booking) {
    selectedBooking.value = booking.originalBooking
    showEditModal.value = true
}
function closeEditModal() {
    showEditModal.value = false
    selectedBooking.value = null
}
function handleBookingUpdated() {
    closeEditModal()
}
function handleRefundBooking(booking) {
    selectedRefundBooking.value = booking.originalBooking || booking
    showRefundModal.value = true
}
function closeRefundModal() {
    showRefundModal.value = false
    selectedRefundBooking.value = null
}
function handleRefundProcessed() {
    closeRefundModal()
}
function handleAttendanceChanged() {
    // Attendance mutations handled inside BookingList via useCalendar
}
</script>

<template>
    <PageContainer class="bookings-page">
        <div class="page-header">
            <h1>Bookings</h1>
        </div>

        <!-- Filter bar -->
        <div class="filter-bar card">
            <div class="card-body filter-bar-body">
                <!-- Student filters: instructor + date range -->
                <template v-if="userStore.isStudent">
                    <div class="filter-group">
                        <Label>Instructor</Label>
                        <select v-model="filters.instructorId" class="filter-select">
                            <option :value="null">All instructors</option>
                            <option
                                v-for="inst in studentBookingInstructors"
                                :key="inst.id"
                                :value="inst.id"
                            >{{ inst.name }}</option>
                        </select>
                    </div>
                </template>

                <!-- Instructor filters: student + date range -->
                <template v-else-if="userStore.isInstructor">
                    <div class="filter-group">
                        <Label>Student</Label>
                        <SearchBar
                            v-model="studentSearchQuery"
                            placeholder="Search by student name..."
                            :results="studentSearchResults"
                            :show-results="isStudentSearchFocused"
                            :min-chars="1"
                            @focus="isStudentSearchFocused = true"
                            @blur="handleStudentSearchBlur"
                            @select="handleStudentSelect"
                        >
                            <template #result="{ result }">
                                <div class="result-content">
                                    <div class="result-primary">{{ result.name }}</div>
                                    <div class="result-secondary">{{ result.email }}</div>
                                </div>
                            </template>
                        </SearchBar>
                        <span v-if="filters.studentId" class="filter-chip">
                            {{ selectedStudentName }}
                            <button class="chip-clear" @click="clearStudentFilter">×</button>
                        </span>
                    </div>
                </template>

                <!-- Admin filters: instructor + student + date range -->
                <template v-else-if="userStore.isAdmin">
                    <div class="filter-group">
                        <Label>Instructor</Label>
                        <SearchBar
                            v-model="instructorSearchQuery"
                            placeholder="Search by instructor name..."
                            :results="instructorSearchResults"
                            :show-results="isInstructorSearchFocused"
                            :min-chars="1"
                            @focus="isInstructorSearchFocused = true"
                            @blur="handleInstructorSearchBlur"
                            @select="handleInstructorSelect"
                        >
                            <template #result="{ result }">
                                <div class="result-content">
                                    <div class="result-primary">{{ result.name }}</div>
                                    <div class="result-secondary">{{ result.User?.email || result.email }}</div>
                                </div>
                            </template>
                        </SearchBar>
                        <span v-if="filters.instructorId" class="filter-chip">
                            {{ selectedInstructorName }}
                            <button class="chip-clear" @click="clearInstructorFilter">×</button>
                        </span>
                    </div>

                    <div class="filter-group">
                        <Label>Student</Label>
                        <SearchBar
                            v-model="studentSearchQuery"
                            placeholder="Search by student name..."
                            :results="studentSearchResults"
                            :show-results="isStudentSearchFocused"
                            :min-chars="1"
                            @focus="isStudentSearchFocused = true"
                            @blur="handleStudentSearchBlur"
                            @select="handleStudentSelect"
                        >
                            <template #result="{ result }">
                                <div class="result-content">
                                    <div class="result-primary">{{ result.name }}</div>
                                    <div class="result-secondary">{{ result.email }}</div>
                                </div>
                            </template>
                        </SearchBar>
                        <span v-if="filters.studentId" class="filter-chip">
                            {{ selectedStudentName }}
                            <button class="chip-clear" @click="clearStudentFilter">×</button>
                        </span>
                    </div>
                </template>

                <!-- Shared: date range (all roles) -->
                <div class="filter-group">
                    <Label>From</Label>
                    <input type="date" v-model="filters.startDate" class="filter-date" />
                </div>
                <div class="filter-group">
                    <Label>To</Label>
                    <input type="date" v-model="filters.endDate" class="filter-date" />
                </div>

                <Button variant="outline" size="sm" @click="clearAllFilters">Clear</Button>
            </div>
        </div>

        <!-- Booking list -->
        <BookingList
            :bookings="filteredBookings"
            :loading="isLoading"
            :userId="userStore.user?.id"
            :userRole="userStore.user?.role"
            :server-mode="true"
            :current-page="activeCurrentPage"
            :total-pages="activeTotalPages"
            @edit-booking="handleEditBooking"
            @cancel-booking="handleEditBooking"
            @view-booking="handleEditBooking"
            @attendance-changed="handleAttendanceChanged"
            @process-refund="handleRefundBooking"
            @page-change="handlePageChange"
            @tab-change="handleTabChange"
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
                @booking-cancelled="handleBookingUpdated"
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

<style scoped>
.page-header {
    margin-bottom: var(--spacing-lg);
}

.page-header h1 {
    color: var(--secondary-color);
    font-size: 2rem;
    margin: 0;
}

.filter-bar {
    margin-bottom: var(--spacing-lg);
}

.filter-bar-body {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--spacing-md);
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    min-width: 160px;
}

.filter-select,
.filter-date {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-sm);
    background: white;
    color: var(--text-primary);
}

.filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: var(--color-primary, #3b82f6);
    color: white;
    border-radius: 12px;
    font-size: var(--font-size-xs);
    font-weight: 500;
}

.chip-clear {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0 2px;
}

.result-content {
    padding: 2px 0;
}

.result-primary {
    font-weight: 500;
}

.result-secondary {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
}

@media (max-width: 768px) {
    .filter-bar-body {
        flex-direction: column;
        align-items: stretch;
    }

    .filter-group {
        min-width: unset;
    }
}
</style>
