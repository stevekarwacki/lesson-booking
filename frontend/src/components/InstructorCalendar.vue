<template v-if="instructor">

    <!-- Booked Lessons List -->
    <div v-if="formattedBookingsForList.length > 0" class="card">
        <div class="card-header">
            <h3>{{ selectedDate ? 'Booked Lessons for ' + selectedDay?.formattedDate : "Today's Booked Lessons" }}</h3>
        </div>
        <div class="card-body">
            <BookingList
                :bookings="formattedBookingsForList"
                :userId="userStore.user.id"
                :userRole="userStore.canManageUsers ? 'admin' : userStore.canManageCalendar ? 'instructor' : 'student'"
                @edit-booking="handleEditBookingFromList"
                @cancel-booking="handleCancelBookingFromList"
                @view-booking="handleViewBookingFromList"
            />
        </div>
    </div>

    <!-- Date selection -->
    <div class="view-controls card">
        <div class="card-body time-selection-container">
            <!-- Week navigation - only show when no specific date is selected -->
            <div class="week-navigation" v-if="!selectedDate && $mq.lgPlus">
                <button 
                    class="form-button form-button-secondary"
                    @click="previousWeek"
                    :disabled="isPreviousWeekInPast"
                >
                    Previous Week
                </button>
                <span class="week-display">
                    Week of {{ weekStart.toLocaleDateString() }}
                </span>
                <button 
                    class="form-button form-button-secondary"
                    @click="nextWeek"
                >
                    Next Week
                </button>
            </div>

            <button 
                v-if="selectedDate && $mq.lgPlus" 
                class="form-button form-button-secondary"
                @click="clearSelectedDate"
            >
                Back to Weekly View
            </button>

            <!-- Date selection -->
            <div class="form-group date-select-group">
                <label for="date-select" class="form-label">{{ !selectedDate ? 'Or select' : 'Select' }} a date:</label>
                <input 
                    type="date" 
                    id="date-select"
                    v-model="selectedDate"
                    :min="today"
                    @change="handleDateChange"
                    class="form-input"
                >
            </div>
        </div>
    </div>

    <!-- Weekly Schedule View -->
    <div v-if="!selectedDate && $mq.lgPlus" class="schedule-view card">
        <div class="card-body">
            <WeeklyScheduleView 
                :weeklySchedule="weeklySchedule"
                :weekStartDate="weekStart"
                :useColumnLayout="true"
                @slot-selected="handleSlotSelected"
            />
        </div>
    </div>

    <!-- Daily Schedule View -->
    <div v-if="(!$mq.lgPlus || selectedDate) && dailyScheduleLoaded" class="schedule-view card">
        <div class="card-body">
            <DailyScheduleView 
                :dailySchedule="dailySchedule"
                :selected-day="selectedDay"
                @slot-selected="handleSlotSelected"
            />
        </div>
    </div>

    <div v-else-if="selectedDate && dailyScheduleLoaded && Object.keys(dailySchedule).length === 0" class="form-message">
        <p>No available time slots for this date.</p>
    </div>

    <div v-else-if="selectedDate && !dailyScheduleLoaded" class="form-message">
        <p>Loading schedule...</p>
    </div>

    <div v-if="error" class="form-message error-message">{{ error }}</div>

    <BookingModal
        v-if="showBookingModal"
        :slot="selectedSlot"
        @close="showBookingModal = false"
        @booking-confirmed="handleBookingConfirmed"
    />
    
    <EditBookingModal
        v-if="showEditBookingModal && selectedSlot"
        :booking="selectedSlot"
        @close="closeEditBookingModal"
        @booking-updated="handleBookingUpdated"
        @booking-cancelled="handleBookingCancelled"
    />
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useMq } from 'vue3-mq'
import { useUserStore } from '../stores/userStore'
import { useScheduleStore } from '../stores/scheduleStore'
import WeeklyScheduleView from './WeeklyScheduleView.vue'
import DailyScheduleView from './DailyScheduleView.vue'
import BookingList from './BookingList.vue'
import { getStartOfDay, formatTime, slotToTime } from '../utils/timeFormatting'
import BookingModal from './BookingModal.vue'
import EditBookingModal from './EditBookingModal.vue'

const userStore = useUserStore()
const scheduleStore = useScheduleStore()

const { instructor } = defineProps({
    instructor: {
        type: Object,
        required: true
    }
})

const SLOT_DURATION = 2

const selectedDate = useMq().lgPlus ? ref('') : ref(new Date().toISOString().split('T')[0])
const weeklyScheduleData = ref([])
const dailyScheduleData = ref({})
const dailyScheduleLoaded = ref(false)
const error = ref('')
const dailyBookings = ref([])

// Week selection state
const selectedWeek = ref(firstDayOfWeek(new Date()))

// Get today's date in YYYY-MM-DD format
const today = computed(() => {
    const date = new Date()
    return date.toISOString().split('T')[0]
})

// Get start of week (Sunday)
const weekStart = computed(() => {
    const date = new Date(selectedWeek.value)
    const day = date.getDay()
    date.setDate(date.getDate() - day)
    return date
})

function firstDayOfWeek(dateObject, firstDayOfWeekIndex = 0) {
    const dayOfWeek = dateObject.getDay(),
        firstDayOfWeek = new Date(dateObject),
        diff = dayOfWeek >= firstDayOfWeekIndex ?
            dayOfWeek - firstDayOfWeekIndex :
            6 - dayOfWeek

    firstDayOfWeek.setDate(dateObject.getDate() - diff)
    firstDayOfWeek.setHours(0,0,0,0)

    return firstDayOfWeek
}

// Check if previous week would be entirely in the past
const isPreviousWeekInPast = computed(() => {
    const today = getStartOfDay(new Date())
    
    const previousWeekStart = new Date(weekStart.value)
    previousWeekStart.setDate(previousWeekStart.getDate() - 7)
    
    // Get end of previous week (Saturday)
    const previousWeekEnd = new Date(previousWeekStart)
    previousWeekEnd.setDate(previousWeekStart.getDate() + 6)
    previousWeekEnd.setHours(23, 59, 59, 999) // End of day
    
    return previousWeekEnd < today
})

const handleDateChange = () => {
    if (selectedDate.value) {
        fetchDailySchedule()
    }
}

const showBookingModal = ref(false)
const showEditBookingModal = ref(false)
const selectedSlot = ref(null)

const handleSlotSelected = (slot) => {
    // Instructors should not be able to book new lessons on available slots
    if (slot.type === 'available') {
        // Only prevent booking for instructors, allow students to book
        if (userStore.canManageCalendar || userStore.canManageUsers) {
            return // Do nothing for available slots when user is instructor/admin
        }
        
        // For students, open booking modal
        selectedSlot.value = {
            ...slot,
            instructorId: instructor.id
        }
        showBookingModal.value = true
        return
    }
    
    // For booked slots, allow instructors and admins to edit/cancel student bookings
    if (slot.type === 'booked') {
        // Check if current user can manage bookings (instructors and admins)
        if ((userStore.canManageCalendar || userStore.canManageUsers) && slot.student && slot.student.id) {
            // Create a booking object that matches the EditBookingModal expected format
            const bookingObject = {
                id: slot.id || slot.bookingId,
                date: slot.date.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
                start_slot: slot.start_slot,
                duration: slot.duration,
                instructor_id: instructor.id,
                student_id: slot.student.id,
                status: 'booked',
                Instructor: {
                    User: {
                        name: instructor.name
                    }
                }
            }
            
            selectedSlot.value = bookingObject
            showEditBookingModal.value = true
        }
        // For students viewing their own bookings, allow them to edit as well
        else if (userStore.isStudent && slot.student && slot.student.id === userStore.user.id) {
            const bookingObject = {
                id: slot.id || slot.bookingId,
                date: slot.date.toISOString().split('T')[0],
                start_slot: slot.start_slot,
                duration: slot.duration,
                instructor_id: instructor.id,
                student_id: slot.student.id,
                status: 'booked',
                Instructor: {
                    User: {
                        name: instructor.name
                    }
                }
            }
            
            selectedSlot.value = bookingObject
            showEditBookingModal.value = true
        }
    }
}

const handleBookingConfirmed = (newBooking) => {
    showBookingModal.value = false
    selectedSlot.value = null
    
    // Trigger schedule refresh using the schedule store (consistent with other booking updates)
    scheduleStore.triggerInstructorRefresh(instructor.id)
}

const handleBookingUpdated = () => {
    showEditBookingModal.value = false
    selectedSlot.value = null
    
    // Trigger schedule refresh for updated booking
    scheduleStore.triggerInstructorRefresh(instructor.id)
}

const handleBookingCancelled = () => {
    showEditBookingModal.value = false
    selectedSlot.value = null
    
    // Trigger schedule refresh for cancelled booking
    scheduleStore.triggerInstructorRefresh(instructor.id)
}

const closeEditBookingModal = () => {
    showEditBookingModal.value = false
    selectedSlot.value = null
}

const clearSelectedDate = () => {
    selectedDate.value = ''
}

/**
 * Formats slot for display
 * @param {Object} slot - slot to be formatted
 * @returns {Object} - formatted slot
 */
const formatSlot = (slot, date) => {
    const formattedSlot = {
        start_slot: slot.start_slot,
        duration: slot.duration,
        date: date,
        type: slot.type || slot.status || 'available', // Check 'type' first, then fall back to 'status'
        student: null,
        startTime: null,
        endTime: null,
        // Preserve Google Calendar properties for styling
        is_google_calendar: slot.is_google_calendar,
        source: slot.source
    }

    // Calculate start and end times
    const startHour = Math.floor(slot.start_slot / 4)
    const startMinute = (slot.start_slot % 4) * 15
    const endHour = Math.floor((slot.start_slot + slot.duration) / 4)
    const endMinute = ((slot.start_slot + slot.duration) % 4) * 15

    formattedSlot.startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`
    formattedSlot.endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`

    // Handle student information for both regular bookings and Google Calendar events
    if (slot.student_id) {
        formattedSlot.student = {
            id: slot.student_id,
            name: slot.student_name,
            email: slot.student_email
        }
        // Check if this booking belongs to the current user
        formattedSlot.isOwnBooking = slot.student_id === userStore.user.id
    } else if (slot.is_google_calendar || slot.source === 'google_calendar') {
        // For Google Calendar events, use the formatted display info
        formattedSlot.student = {
            id: null,
            name: slot.student_name || '🗓️ ' + (slot.summary || 'Busy'),
            email: slot.student_email || 'Google Calendar'
        }
        formattedSlot.isOwnBooking = false
    }

    return formattedSlot
}

// Fetch weekly schedule
const fetchWeeklySchedule = async () => {
    if (!instructor.id) return

    try {
        // Get week start and end dates
        const startDate = weekStart.value.toISOString().split('T')[0]
        const endDate = new Date(weekStart.value)
        endDate.setDate(endDate.getDate() + 6)
        const endDateStr = endDate.toISOString().split('T')[0]

        // Fetch both availability and booked events
        const [availabilityResponse, eventsResponse] = await Promise.all([
            fetch(`/api/availability/${instructor.id}/weekly`, {
                headers: { 'Authorization': `Bearer ${userStore.token}` }
            }),
            fetch(`/api/calendar/events/${instructor.id}/${startDate}/${endDateStr}`, {
                headers: { 'Authorization': `Bearer ${userStore.token}` }
            })
        ])

        if (!availabilityResponse.ok || !eventsResponse.ok) {
            throw new Error('Failed to fetch data')
        }

        const [availabilityData, bookedEvents] = await Promise.all([
            availabilityResponse.json(),
            eventsResponse.json()
        ])

        // Initialize schedule with dates
        const formattedSchedule = {}
        const slotTemplate = {}
        
        for (let i = 0; i < 7; i++) {
            const slotDate = new Date(selectedWeek.value)
            slotDate.setDate(slotDate.getDate() + i)
            slotDate.setHours(0,0,0,0)

            slotTemplate[i] = {
                date: slotDate,
                type: 'unavailable'
            }
        }

        // Start with available slots
        availabilityData.forEach(slot => {
            const dayIndex = slot.day_of_week

            for (let i = 0; i < slot.duration; i += SLOT_DURATION) {
                const slotStart = slot.start_slot + i
                const newSlot = Object.assign({}, slot, { start_slot: slotStart, duration: SLOT_DURATION });

                if (!(slotStart in formattedSchedule)) {
                    formattedSchedule[slotStart] = Object.assign({}, slotTemplate)
                }

                formattedSchedule[slotStart][dayIndex] = formatSlot(newSlot, formattedSchedule[slotStart][dayIndex].date)
            }
        })

        // Overwrite availability with booked events
        bookedEvents.forEach(event => {
            // Create date in UTC to match backend
            let eventDate = new Date(event.date)
            eventDate.setUTCHours(0, 0, 0, 0)
            
            // Use UTC day for all events to match backend
            const dayIndex = eventDate.getUTCDay()
            
            const slotStart = event.start_slot
            const eventDuration = event.duration || 2 // Default to 30 minutes if no duration

            // Log booking information
            const now = new Date()
            const currentTime = now.toLocaleTimeString()
            now.setHours(0, 0, 0, 0)
            
            // Create date in both UTC and local
            const bookingDateLocal = new Date(event.date)
            bookingDateLocal.setHours(0, 0, 0, 0)
            
            const bookingDateUTC = new Date(event.date)
            bookingDateUTC.setUTCHours(0, 0, 0, 0)
            
            // For bookings longer than 30 minutes, fill all consecutive slots
            for (let i = 0; i < eventDuration; i += 2) {
                const currentSlot = slotStart + i
                
                // Make sure the slot exists in the schedule before accessing it
                if (formattedSchedule[currentSlot] && formattedSchedule[currentSlot][dayIndex] !== undefined) {
                    const slotData = formatSlot(event, eventDate)
                    
                    // Add metadata to identify multi-slot bookings (only for regular bookings, not Google Calendar)
                    if (!slotData.is_google_calendar) {
                        slotData.isMultiSlot = eventDuration > 2
                        slotData.slotPosition = i / 2 // 0 for first slot, 1 for second slot, etc.
                        slotData.totalSlots = eventDuration / 2 // Total number of 30-min slots
                        slotData.bookingId = event.id // To group related slots
                    }
                    
                    formattedSchedule[currentSlot][dayIndex] = slotData
                }
            }
        })

        weeklyScheduleData.value = formattedSchedule
    } catch (err) {
        error.value = 'Error fetching schedule'
    }
}

const dailySchedule = computed(() => {
    return dailyScheduleData.value
})

const selectedDay = computed(() => {
    if (!selectedDate.value) return ''

    const [year, month, day] = selectedDate.value.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))

    return {
        date: date,
        formattedDate: date.toLocaleDateString(undefined, { 
            weekday: 'long',
            month: 'long',
            day: 'numeric' 
        })
    }
})

const fetchDailySchedule = async () => {
    if (!instructor.id || !selectedDate.value) {
        return
    }

    dailyScheduleLoaded.value = false

    try {
        // Fetch both availability and booked events
        
        const [availabilityResponse, eventsResponse] = await Promise.all([
            fetch(`/api/availability/${instructor.id}/daily/${selectedDate.value}`, {
                headers: { 'Authorization': `Bearer ${userStore.token}` }
            }),
            fetch(`/api/calendar/dailyEvents/${instructor.id}/${selectedDate.value}`, {
                headers: { 'Authorization': `Bearer ${userStore.token}` }
            })
        ])

        if (!availabilityResponse.ok || !eventsResponse.ok) {
            throw new Error('Failed to fetch data')
        }

        const scheduleDate = new Date(selectedDate.value)

        const [availabilityData, bookedEvents] = await Promise.all([
            availabilityResponse.json(),
            eventsResponse.json()
        ])

        const formattedSchedule = {}

        availabilityData.forEach(slot => {
            for (let i = 0; i < slot.duration; i += SLOT_DURATION) {
                const slotStart = slot.start_slot + i
                const newSlot = Object.assign({}, slot, { start_slot: slotStart, duration: SLOT_DURATION });

                formattedSchedule[slotStart] = formatSlot(newSlot, scheduleDate)
            }
        })

        // Split availability slots around booked events and add booked events to schedule
        bookedEvents.forEach(event => {
            const eventDuration = event.duration || 2 // Default to 30 minutes if no duration
            
            // For bookings longer than 30 minutes, fill all consecutive slots
            for (let i = 0; i < eventDuration; i += 2) {
                const currentSlot = event.start_slot + i
                
                if (formattedSchedule[currentSlot]) {
                    const slotData = formatSlot(event, scheduleDate)
                    
                    // Add metadata to identify multi-slot bookings (only for regular bookings, not Google Calendar)
                    if (!slotData.is_google_calendar) {
                        slotData.isMultiSlot = eventDuration > 2
                        slotData.slotPosition = i / 2 // 0 for first slot, 1 for second slot, etc.
                        slotData.totalSlots = eventDuration / 2 // Total number of 30-min slots
                        slotData.bookingId = event.id // To group related slots
                    }
                    
                    formattedSchedule[currentSlot] = slotData
                }
            }
        })

        dailyScheduleData.value = formattedSchedule
        dailyScheduleLoaded.value = true
    } catch (err) {
        error.value = 'Error fetching daily schedule'
        dailyScheduleLoaded.value = false
    }
}

const weeklySchedule = computed(() => {
    // Initialize empty schedule
    let schedule = {
        0: {
            0: { },
            1: { },
            2: { },
            3: { },
            4: { },
            5: { },
            6: { }
        }
    }

    // If we have data, populate the slots
    if (Object.keys(weeklyScheduleData.value).length) {
        schedule = weeklyScheduleData.value
    }

    return schedule
})

// Navigation methods
const previousWeek = () => {
    const newDate = new Date(selectedWeek.value)
    newDate.setDate(newDate.getDate() - 7)
    selectedWeek.value = newDate
}

const nextWeek = () => {
    const newDate = new Date(selectedWeek.value)
    newDate.setDate(newDate.getDate() + 7)
    selectedWeek.value = newDate
}

// Watch for changes to selected week
watch(selectedWeek, () => {
    fetchWeeklySchedule()
})

// Watch for changes to selected date
watch(selectedDate, () => {
    fetchDailySchedule()
    fetchDailyBookings()
})

// Fetch data on component mount
onMounted(() => {
    fetchWeeklySchedule()
    fetchDailySchedule()
    fetchDailyBookings()
})

watch(() => instructor, async (newInstructor) => {
    if (newInstructor) {
        await fetchWeeklySchedule()
    }
}, { immediate: true })

// Watch for schedule refresh triggers
watch(() => scheduleStore.refreshTrigger, async () => {
    if (instructor?.id && scheduleStore.needsRefresh(instructor.id)) {
        await fetchWeeklySchedule()
        await fetchDailySchedule()
        await fetchDailyBookings()
        scheduleStore.markInstructorRefreshed(instructor.id)
    }
})


// Transform dailyBookings for BookingList component
const formattedBookingsForList = computed(() => {
    return dailyBookings.value.map(booking => ({
        id: booking.id || `temp-${booking.start_slot}`,
        date: booking.date,
        startTime: formatTime(slotToTime(booking.start_slot)),
        endTime: formatTime(slotToTime(booking.start_slot + booking.duration)),
        instructorName: instructor.name,
        studentName: booking.student?.name || 'Unknown Student',
        status: booking.type === 'booked' ? 'booked' : booking.status || 'booked',
        isRecurring: false, // Add logic for recurring if needed
        // Original booking data for actions
        originalBooking: booking
    }))
})

const fetchDailyBookings = async () => {
    if (!instructor.id || !selectedDate.value) {
        dailyBookings.value = []
        return
    }

    const bookingDate = selectedDate.value

    try {
        const response = await fetch(`/api/calendar/dailyEvents/${instructor.id}/${bookingDate}`, {
            headers: { 'Authorization': `Bearer ${userStore.token}` }
        })

        if (!response.ok) { 
            throw new Error('Failed to fetch daily bookings')
        }

        const events = await response.json()
        dailyBookings.value = events.map(event => (formatSlot(event, new Date(selectedDate.value))))
    } catch (error) {
        console.error('Error fetching daily bookings:', error)
        dailyBookings.value = []
    }
}

// BookingList event handlers
const handleEditBookingFromList = (booking) => {
    console.log('Edit booking from list:', booking)
    // For now, just log - later we can integrate with EditBookingModal
    // This could open the booking modal in edit mode
    selectedSlot.value = {
        ...booking.originalBooking,
        instructorId: instructor.id,
        isEditing: true
    }
    showBookingModal.value = true
}

const handleCancelBookingFromList = (booking) => {
    console.log('Cancel booking from list:', booking)
    // TODO: Implement booking cancellation
    // This would call an API to cancel the booking
    alert(`Cancel booking functionality would be implemented here for booking ID: ${booking.id}`)
}

const handleViewBookingFromList = (booking) => {
    console.log('View booking from list:', booking)
    // For cancelled bookings, show in view-only mode
    selectedSlot.value = {
        ...booking.originalBooking,
        instructorId: instructor.id,
        isViewOnly: true
    }
    showBookingModal.value = true
}

</script>

<style scoped>
.view-controls {
    margin-bottom: var(--spacing-lg);
}

.week-navigation {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
}

.week-display {
    font-size: var(--font-size-lg);
    color: var(--text-primary);
}

.time-selection-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
}

.date-select-group {
    display: flex;
}

.schedule-view {
    margin-top: var(--spacing-lg);
}

@media (max-width: 768px) {
    .week-navigation {
        flex-direction: column;
        gap: var(--spacing-sm);
    }
}
</style> 