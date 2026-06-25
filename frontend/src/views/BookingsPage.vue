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
import { useBookings } from '../composables/useBookings'
import { useStudents } from '../composables/useStudents'
import { slotToTime, formatTime } from '../utils/timeFormatting'
import { fetchInstructors as fetchInstructorsHelper } from '../utils/fetchHelper'

const userStore = useUserStore()

// Initial filter scope: "Today" tab (matches BookingList's default active tab)
const todayStr = new Date().toISOString().split('T')[0]
const todayInitialFilters = { startDate: todayStr, endDate: todayStr, status: null }

// ---------------------------------------------------------------------------
// Single composable — server enforces role scoping automatically
// ---------------------------------------------------------------------------
const {
    bookings: rawBookings,
    totalBookings,
    currentPage,
    filters: serverFilters,
    isLoading,
    setFilters,
    setPage
} = useBookings({ initialFilters: todayInitialFilters })

// ---------------------------------------------------------------------------
// UI filter state (controls the filter bar; pushed to server on change)
// ---------------------------------------------------------------------------
const filters = ref({
    instructorId: null,
    studentId: null,
    startDate: null,
    endDate: null
})

// Students list for instructor + admin filter bar
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

// Instructors list (admin only — fetched once on mount)
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

if (userStore.isAdmin) {
    fetchInstructorsHelper(userStore.token)
        .then(r => { allInstructors.value = r.instructors.filter(i => i.is_active) })
        .catch(() => {})
}

// For student role: derive unique instructors from currently loaded bookings to populate the filter select
const studentBookingInstructors = computed(() => {
    const seen = new Map()
    for (const b of rawBookings.value ?? []) {
        const id = b.instructor_id
        const name = b.instructor_name || b.Instructor?.User?.name || ''
        if (id && !seen.has(id)) seen.set(id, { id, name })
    }
    return [...seen.values()]
})

// ---------------------------------------------------------------------------
// Push UI filter changes to the server
// ---------------------------------------------------------------------------
watch(filters, (f) => {
    setFilters({
        instructorId: f.instructorId || null,
        studentId: f.studentId || null,
        startDate: f.startDate || null,
        endDate: f.endDate || null
    })
}, { deep: true })

// ---------------------------------------------------------------------------
// Tab → server filter mapping
// ---------------------------------------------------------------------------
function tabToServerFilters(tab) {
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    switch (tab) {
        case 'today':
            return { startDate: today, endDate: today, status: null }
        case 'upcoming':
            return { startDate: tomorrow.toISOString().split('T')[0], endDate: null, status: null }
        case 'past':
            return { startDate: null, endDate: yesterday.toISOString().split('T')[0], status: null }
        case 'cancelled':
            return { startDate: null, endDate: null, status: 'cancelled' }
        default:
            return { startDate: null, endDate: null, status: null }
    }
}

function handleTabChange(tab) {
    setFilters({ ...tabToServerFilters(tab), instructorId: filters.value.instructorId, studentId: filters.value.studentId })
}

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

const displayBookings = computed(() => (rawBookings.value ?? []).map(formatBooking))

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
function handlePageChange(page) {
    if (page < 1) return
    if (totalBookings.value != null) {
        const maxPage = Math.ceil(totalBookings.value / 20)
        if (page > maxPage) return
    }
    setPage(page)
}

// ---------------------------------------------------------------------------
// Search/filter UI helpers
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
    selectedInstructorName.value = instructor.User?.name
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
            <h1>Your Bookings</h1>
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
            :bookings="displayBookings"
            :loading="isLoading"
            :userId="userStore.user?.id"
            :userRole="userStore.user?.role"
            :current-page="currentPage"
            :total-bookings="totalBookings"
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
