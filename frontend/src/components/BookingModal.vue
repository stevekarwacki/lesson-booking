<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h2>{{ isBookingOnBehalf ? 'Book Lesson for Student' : 'Confirm Booking' }}</h2>
            </div>
            
            <div class="modal-body">
                <!-- Student Selector (only for booking on behalf) -->
                <div v-if="isBookingOnBehalf" class="student-selector">
                    <h3>Select Student</h3>
                    <SearchBar
                        v-model="studentSearchQuery"
                        :results="searchResults"
                        :show-results="showStudentResults"
                        :min-chars="1"
                        placeholder="Search for a student..."
                        @select="handleStudentSelect"
                        @focus="showStudentResults = true"
                        @blur="handleSearchBlur"
                    >
                        <template #result="{ result }">
                            <div class="result-content">
                                <div class="result-primary">{{ result.name }}</div>
                                <div class="result-secondary">{{ result.email }}</div>
                            </div>
                        </template>
                    </SearchBar>
                    <div v-if="selectedStudent" class="selected-student">
                        <strong>Selected:</strong> {{ selectedStudent.name }} ({{ selectedStudent.email }})
                    </div>
                    <div v-if="!selectedStudent && error" class="form-message error-message">
                        Please select a student before booking.
                    </div>
                </div>

                <div class="booking-details">
                    <p>Date: {{ currentSlot.date.toISOString().split('T')[0] }}</p>
                    <p>Time: {{ slotToTime(currentSlot.startSlot) }} - {{ displayEndTime }}</p>
                </div>

                <div class="duration-selection">
                    <h3>Lesson Duration</h3>
                    <div class="form-group">
                        <div class="form-input-group">
                            <div class="form-radio-group">
                                <input 
                                    type="radio" 
                                    id="duration30" 
                                    v-model="selectedDuration" 
                                    value="30"
                                    class="form-input"
                                >
                                <label for="duration30" class="form-radio-label">
                                    30 minutes
                                </label>
                            </div>
                            <div class="form-radio-group">
                                <input 
                                    type="radio" 
                                    id="duration60" 
                                    v-model="selectedDuration" 
                                    value="60"
                                    class="form-input"
                                >
                                <label for="duration60" class="form-radio-label">
                                    60 minutes
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="booking-options">
                    <h3>Single Lesson</h3>
                    <p>{{ selectedDuration }} minutes - ${{ lessonPrice }}</p>
                </div>

                <!-- Conflict Warning -->
                <div v-if="hasTimeConflict" class="conflict-warning">
                    <h3>Time Conflict</h3>
                    <p>{{ conflictMessage }}</p>
                    <p><strong>Please select a different time or choose 30 minutes instead.</strong></p>
                </div>

                <div v-if="showPaymentOptions && !hasTimeConflict && (!isBookingOnBehalf || selectedStudent)" class="payment-options">
                    <h3>Payment Method</h3>
                    <div class="form-group">
                        <div class="form-input-group">
                            <div v-if="availableCredits > 0" class="form-radio-group">
                                <input 
                                    type="radio" 
                                    id="useCredits" 
                                    v-model="paymentMethod" 
                                    value="credits"
                                    class="form-input"
                                >
                                <label for="useCredits" class="form-radio-label">
                                    Use Pre-paid {{ selectedDuration }}-Minute Lessons ({{ availableCredits }} remaining)
                                </label>
                            </div>
                            <div v-if="showCardPaymentOption" class="form-radio-group">
                                <input 
                                    type="radio" 
                                    id="payNow" 
                                    v-model="paymentMethod" 
                                    value="direct"
                                    class="form-input"
                                >
                                <label for="payNow" class="form-radio-label">Pay Now (${{ lessonPrice }})</label>
                            </div>
                            <div v-if="canUseInPersonPayment" class="form-radio-group">
                                <input 
                                    type="radio" 
                                    id="payInPerson" 
                                    v-model="paymentMethod" 
                                    value="in-person"
                                    class="form-input"
                                >
                                <label for="payInPerson" class="form-radio-label">Pay In-Person (${{ lessonPrice }})</label>
                            </div>
                        </div>
                    </div>

                    <!-- Stripe Payment Form -->
                    <div v-if="paymentMethod === 'direct'" class="stripe-form-container">
                        <StripePaymentForm
                            :amount="lessonPrice"
                            @payment-success="handleStripeSuccess"
                            @payment-error="handleStripeError"
                        />
                    </div>
                </div>

                <div v-if="error" class="form-message error-message">
                    {{ error }}
                </div>
            </div>

            <div class="modal-footer">
                <button 
                    class="form-button form-button-cancel"
                    @click="$emit('close')"
                    :disabled="loading"
                >
                    Cancel
                </button>
                <button 
                    v-if="paymentMethod !== 'direct'"
                    class="form-button" 
                    @click="confirmBooking"
                    :disabled="isConfirmDisabled"
                >
                    {{ loading ? 'Processing...' : hasTimeConflict ? 'Booking Conflict' : isBookingOnBehalf && !selectedStudent ? 'Select Student' : 'Confirm Booking' }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useTimezoneStore } from '../stores/timezoneStore'
import { useCredits } from '../composables/useCredits'
import { useFormFeedback } from '../composables/useFormFeedback'
import { slotToTimeUTC, slotToTime, formatDateUTC, createUTCDateFromSlot } from '../utils/timeFormatting'
import StripePaymentForm from './StripePaymentForm.vue'
import SearchBar from './SearchBar.vue'

const props = defineProps({
    slot: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['close', 'booking-confirmed'])

const userStore = useUserStore()
const timezoneStore = useTimezoneStore()
const { showSuccess, showError } = useFormFeedback()

// Use credits composable for credit state management
const { 
    getAvailableCredits,
    fetchCredits
} = useCredits()

const loading = ref(false)
const error = ref(null)
const paymentMethod = ref('credits')
const showPaymentOptions = ref(true)
const currentSlot = ref(props.slot) // Create a reactive reference to the slot
const selectedDuration = ref('30') // Will be updated from admin settings
const instructorHourlyRate = ref(50) // Default rate, will be fetched from database
const canUseInPersonPayment = ref(false) // Will be fetched from user payment options
const cardPaymentOnBehalfEnabled = ref(false) // Will be fetched from lesson settings

// Booking on behalf state
const isBookingOnBehalf = computed(() => props.slot.bookingOnBehalf === true)
const allStudents = ref([])
const selectedStudent = ref(null)
const studentSearchQuery = ref('')
const showStudentResults = ref(false)
const selectedStudentCredits = ref(0)

// Computed search results for student selector
const searchResults = computed(() => {
    if (!studentSearchQuery.value || studentSearchQuery.value.length < 1) {
        return allStudents.value
    }
    
    const query = studentSearchQuery.value.toLowerCase()
    return allStudents.value.filter(student => {
        const name = student.name?.toLowerCase() || ''
        const email = student.email?.toLowerCase() || ''
        return name.includes(query) || email.includes(query)
    })
})

// Computed property for the displayed end time based on selected duration
const displayEndTime = computed(() => {
    const durationInSlots = parseInt(selectedDuration.value) / 15;
    return slotToTime(parseInt(currentSlot.value.startSlot) + durationInSlots);
})

// Reactive properties for conflict checking
const hasTimeConflict = ref(false)
const conflictMessage = ref('')

// Function to check for time conflicts when duration changes
const checkTimeConflicts = async () => {
    if (selectedDuration.value === '30') {
        // 30-minute slots are pre-validated as available
        hasTimeConflict.value = false
        conflictMessage.value = ''
        return
    }

    try {
        // For 60-minute lessons, fetch availability and booked events to check conflicts
        const formattedDate = currentSlot.value.date.toISOString().split('T')[0]
        
        const [availabilityResponse, eventsResponse] = await Promise.all([
            fetch(`/api/availability/${currentSlot.value.instructorId}/daily/${formattedDate}`, {
                headers: { 'Authorization': `Bearer ${userStore.token}` }
            }),
            fetch(`/api/calendar/dailyEvents/${currentSlot.value.instructorId}/${formattedDate}`, {
                headers: { 'Authorization': `Bearer ${userStore.token}` }
            })
        ])

        if (!availabilityResponse.ok || !eventsResponse.ok) {
            hasTimeConflict.value = true
            conflictMessage.value = 'Unable to check availability'
            return
        }

        const [availabilityData, bookedEvents] = await Promise.all([
            availabilityResponse.json(),
            eventsResponse.json()
        ])

        // Check if the extended duration (60 minutes = 4 slots) would conflict
        const startSlot = currentSlot.value.startSlot
        const durationInSlots = parseInt(selectedDuration.value) / 15
        const endSlot = startSlot + durationInSlots

        // Check for conflicts with existing bookings
        const hasBookingConflict = bookedEvents.some(event => {
            const eventStart = event.start_slot
            const eventEnd = event.start_slot + event.duration
            return startSlot < eventEnd && endSlot > eventStart
        })

        if (hasBookingConflict) {
            hasTimeConflict.value = true
            conflictMessage.value = 'The requested 60-minute time slot conflicts with existing bookings. Please select a different time or try a 30-minute lesson.'
            return
        }

        // Check if instructor has availability for the full duration
        const hasAvailability = availabilityData.some(slot => {
            return startSlot >= slot.start_slot && 
                   endSlot <= slot.start_slot + slot.duration
        })

        if (!hasAvailability) {
            hasTimeConflict.value = true
            conflictMessage.value = 'Instructor is not available for the full 60 minutes requested. Please check availability or select a shorter duration.'
            return
        }

        // No conflicts found
        hasTimeConflict.value = false
        conflictMessage.value = ''

    } catch (err) {
        hasTimeConflict.value = true
        conflictMessage.value = 'Unable to validate booking availability'
    }
}

// Watch for duration changes and validate
watch(selectedDuration, () => {
    checkTimeConflicts()
    
    // Update payment method based on available credits for new duration
    if (availableCredits.value > 0) {
        paymentMethod.value = 'credits'
    } else if (canUseInPersonPayment.value) {
        paymentMethod.value = 'in-person'
    } else {
        paymentMethod.value = 'direct'
    }
})

// Computed property for pricing based on selected duration and instructor's rate
const lessonPrice = computed(() => {
    const rate = instructorHourlyRate.value || 50; // This is not actually a hourly rate, it's the cost of the shortest lesson offerred. Fallback to $50 if no rate set
    // Rate represents 30-minute lesson cost, so 60-minute lessons cost double
    return parseInt(selectedDuration.value) === 30 ? rate : rate * 2;
})

// Computed property for available credits for selected duration
const availableCredits = computed(() => {
    // If booking on behalf, use selected student's credits
    if (isBookingOnBehalf.value && selectedStudent.value) {
        return selectedStudentCredits.value
    }
    // Otherwise use current user's credits
    return getAvailableCredits.value(selectedDuration.value);
})

// Computed property to determine if card payment should be shown
const showCardPaymentOption = computed(() => {
    // For regular bookings, always show card payment
    if (!isBookingOnBehalf.value) {
        return true
    }
    // For booking on behalf, only show if enabled in settings
    return cardPaymentOnBehalfEnabled.value
})

// Computed property to determine if confirm button should be disabled
const isConfirmDisabled = computed(() => {
    // Always disabled when loading or has time conflict
    if (loading.value || hasTimeConflict.value) {
        return true
    }
    // When booking on behalf, require a student to be selected
    if (isBookingOnBehalf.value && !selectedStudent.value) {
        return true
    }
    return false
})

// Fetch all students for booking on behalf
const fetchAllStudents = async () => {
    try {
        const response = await fetch('/api/admin/users?role=student', {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (response.ok) {
            const data = await response.json()
            allStudents.value = data.users || []
        }
    } catch (err) {
        console.error('Error fetching students:', err)
    }
}

// Handle student selection
const handleStudentSelect = async (student) => {
    selectedStudent.value = student
    studentSearchQuery.value = student.name
    showStudentResults.value = false
    
    // Fetch the selected student's credit balance
    await fetchStudentCredits(student.id)
}

// Handle search blur with delay to allow click event
const handleSearchBlur = () => {
    setTimeout(() => {
        showStudentResults.value = false
    }, 200)
}

// Fetch credit balance for selected student
const fetchStudentCredits = async (studentId) => {
    try {
        const response = await fetch(`/api/users/${studentId}/credits?duration=${selectedDuration.value}`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (response.ok) {
            const data = await response.json()
            selectedStudentCredits.value = data.availableCredits || 0
            
            // Update payment method based on credits and settings
            updatePaymentMethodForBookingOnBehalf()
        }
    } catch (err) {
        console.error('Error fetching student credits:', err)
        selectedStudentCredits.value = 0
    }
}

// Update payment method when booking on behalf
const updatePaymentMethodForBookingOnBehalf = () => {
    if (isBookingOnBehalf.value) {
        // Default to in-person payment
        paymentMethod.value = 'in-person'
        // Will show credits option if available via the template
    }
}

// Watch for duration changes to update student credits
watch(selectedDuration, async () => {
    if (isBookingOnBehalf.value && selectedStudent.value) {
        await fetchStudentCredits(selectedStudent.value.id)
    }
})

// Fetch instructor's hourly rate
const fetchInstructorRate = async () => {
    try {
        const response = await fetch(`/api/instructors/${currentSlot.value.instructorId}`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (response.ok) {
            const instructor = await response.json()
            if (instructor.hourly_rate) {
                instructorHourlyRate.value = parseFloat(instructor.hourly_rate)
            }
        }
    } catch (err) {
        console.error('Error fetching instructor rate:', err)
    }
}

// Fetch user's payment options (including in-person payment eligibility)
const fetchPaymentOptions = async () => {
    try {
        const response = await fetch('/api/users/me/payment-options', {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (response.ok) {
            const data = await response.json()
            canUseInPersonPayment.value = data.canUseInPersonPayment || false
        }
    } catch (err) {
        console.error('Error fetching payment options:', err)
        // Default to false if we can't fetch payment options
        canUseInPersonPayment.value = false
    }
}

// Fetch user credits and instructor rate when modal opens
onMounted(async () => {
    // If booking on behalf, fetch all students
    if (isBookingOnBehalf.value) {
        await fetchAllStudents()
        // Default to in-person payment for booking on behalf
        paymentMethod.value = 'in-person'
        canUseInPersonPayment.value = true
    }
    
    // Fetch credits, instructor rate, payment options, and lesson settings in parallel
    await Promise.all([
        (async () => {
            // Skip credit fetching if booking on behalf (will fetch after student selection)
            if (isBookingOnBehalf.value) {
                return
            }
            
            try {
                await fetchCredits()
                
                // If user has credits for the selected duration, default to using them
                if (availableCredits.value > 0) {
                    paymentMethod.value = 'credits'
                } else if (canUseInPersonPayment.value) {
                    paymentMethod.value = 'in-person'
                    showPaymentOptions.value = true
                } else {
                    paymentMethod.value = 'direct'
                    showPaymentOptions.value = true
                }
            } catch (err) {
                // Default to direct payment if we can't fetch credits
                if (canUseInPersonPayment.value) {
                    paymentMethod.value = 'in-person'
                } else {
                    paymentMethod.value = 'direct'
                }
                showPaymentOptions.value = true
            }
        })(),
        fetchInstructorRate(),
        // Only fetch payment options if not booking on behalf
        isBookingOnBehalf.value ? Promise.resolve() : fetchPaymentOptions(),
        (async () => {
            try {
                // Fetch public lesson settings (default duration)
                const publicResponse = await fetch('/api/branding/lesson-settings')
                if (publicResponse.ok) {
                    const data = await publicResponse.json()
                    const defaultDuration = data.default_duration_minutes || 30
                    selectedDuration.value = defaultDuration.toString()
                }
                
                // Fetch admin lesson settings (card payment on behalf) if admin/instructor
                if (isBookingOnBehalf.value) {
                    const adminResponse = await fetch('/api/admin/settings/lessons', {
                        headers: {
                            'Authorization': `Bearer ${userStore.token}`
                        }
                    })
                    if (adminResponse.ok) {
                        const adminData = await adminResponse.json()
                        cardPaymentOnBehalfEnabled.value = adminData.card_payment_on_behalf_enabled || false
                    }
                }
            } catch (err) {
                console.error('Error fetching lesson settings:', err)
                // Keep defaults
            }
        })()
    ])
    
    // Check for conflicts on initial load
    await checkTimeConflicts()
})

const handleStripeSuccess = async () => {
    // Ensure payment method is set to direct for Stripe payments
    paymentMethod.value = 'direct'
    
    try {
        loading.value = true
        error.value = null
        await confirmBooking()
    } catch (err) {
        console.error('Payment success error:', err)
        error.value = err.message || 'Failed to process payment'
    } finally {
        loading.value = false
    }
}

const handleStripeError = (err) => {
    error.value = err.message || 'Payment failed'
    console.error('Stripe payment error:', err)
}

const confirmBooking = async () => {
    try {
        loading.value = true;
        error.value = null;

        // Validate student selection if booking on behalf
        if (isBookingOnBehalf.value && !selectedStudent.value) {
            error.value = 'Please select a student before booking.'
            loading.value = false
            return
        }

        // Get the date in UTC using utility functions
        const utcDate = formatDateUTC(currentSlot.value.date);
        
        // Convert slot times to UTC using utility functions
        const startTime = slotToTimeUTC(currentSlot.value.startSlot);
        // Calculate duration in slots (15-minute increments): 30min=2 slots, 60min=4 slots
        const durationInSlots = parseInt(selectedDuration.value) / 15;
        const endTime = slotToTimeUTC(parseInt(currentSlot.value.startSlot) + durationInSlots);
        
        // Create UTC dates using utility functions
        const startDate = createUTCDateFromSlot(utcDate, currentSlot.value.startSlot);
        const endSlot = parseInt(currentSlot.value.startSlot) + durationInSlots;
        const endDate = createUTCDateFromSlot(utcDate, endSlot);

        const requestBody = {
            instructorId: currentSlot.value.instructorId,
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            paymentMethod: paymentMethod.value,
            studentTimezone: timezoneStore.userTimezone
        }

        // Add studentId if booking on behalf
        if (isBookingOnBehalf.value) {
            requestBody.studentId = selectedStudent.value.id
        }

        const response = await fetch('/api/calendar/addEvent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const data = await response.json()
            
            if (data.error === 'INSUFFICIENT_CREDITS') {
                showPaymentOptions.value = true
                error.value = 'Insufficient credits. Please choose a payment method.'
                return
            }
            throw new Error(data.error || 'Failed to book lesson')
        }

        const result = await response.json()
        
        // Credits are automatically deducted by the backend, so we refresh to get accurate count
        if (paymentMethod.value === 'credits') {
            try {
                if (isBookingOnBehalf.value && selectedStudent.value) {
                    await fetchStudentCredits(selectedStudent.value.id)
                } else {
                    await fetchCredits()
                }
            } catch (creditError) {
                console.error('Failed to refresh credits after booking:', creditError)
                // Don't fail the booking if credit refresh fails
            }
        }
        
        // Show success toast
        showSuccess('Lesson booked successfully!')
        
        emit('booking-confirmed', result.booking)
    } catch (err) {
        console.error('confirmBooking error:', err)
        error.value = err.message
        showError(err.message || 'Failed to book lesson')
    } finally {
        loading.value = false
    }
}

// Watch for slot changes
watch(() => props.slot, (newSlot) => {
    currentSlot.value = newSlot
}, { immediate: true })
</script>

<style scoped>
.student-selector {
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background: var(--background-light);
}

.student-selector h3 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
}

.selected-student {
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm);
    background: var(--background-primary);
    border-radius: var(--border-radius);
    color: var(--text-primary);
}

.booking-details {
    margin: var(--spacing-md) 0;
}

.duration-selection {
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background: var(--background-light);
}

.duration-selection h3 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
}

.booking-options {
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
}

.payment-options {
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background: var(--background-light);
}

.payment-options h3 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
}

.form-radio-group {
    margin: var(--spacing-sm) 0;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.form-radio-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--text-primary);
    cursor: pointer;
}

.form-input[type="radio"] {
    width: auto;
    margin: 0;
}

.stripe-form-container {
    margin-top: var(--spacing-md);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--border-color);
}

.form-message {
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm);
    background: rgba(255, 0, 0, 0.1);
    border-radius: var(--border-radius);
}

.conflict-warning {
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid #ffc107;
    border-radius: var(--border-radius);
    color: #856404;
}

.conflict-warning h3 {
    margin: 0 0 var(--spacing-sm) 0;
    color: #856404;
}

.conflict-warning p {
    margin: var(--spacing-sm) 0 0 0;
}

.modal-footer {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-sm);
    justify-content: flex-end;
}

/* Remove old button styles since we're using form-button classes */
.modal-button,
.modal-button-secondary,
.modal-button-primary {
    display: none;
}
</style> 