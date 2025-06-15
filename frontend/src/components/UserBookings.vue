<template>
    <div class="user-bookings card">
        <div class="card-header">
            <h2>Your Upcoming Bookings</h2>
        </div>
        
        <div class="card-body">
            <div v-if="loading" class="loading-state">
                Loading bookings...
            </div>
            
            <div v-else-if="bookings.length === 0" class="form-message">
                <p>You don't have any upcoming lessons booked.</p>
            </div>
            
            <div v-else class="bookings-list">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Instructor</th>
                            <th v-if="useMq().lgPlus">Duration</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="booking in bookings" :key="booking.id">
                            <td>{{ formatDate(new Date(booking.date + 'T00:00:00'), 'anm-abbr') }}</td>
                            <td>{{ formatTime(slotToTime(booking.start_slot)) }} - {{ formatTime(slotToTime(booking.start_slot + booking.duration)) }}</td>
                            <td>{{ booking.Instructor.User.name }}</td>
                            <td v-if="useMq().lgPlus">{{ booking.duration * 15 }} minutes</td>
                            <td class="actions">
                                <button 
                                    class="form-button form-button-secondary"
                                    @click="openEditModal(booking)"
                                >
                                    Edit
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <EditBookingModal
            v-if="showEditModal"
            :booking="selectedBooking"
            @close="closeEditModal"
            @booking-updated="handleBookingUpdated"
        />
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { slotToTime, formatDate, formatTime } from '../utils/timeFormatting'
import EditBookingModal from './EditBookingModal.vue'
import { useMq } from 'vue3-mq'

const userStore = useUserStore()
const bookings = ref([])
const loading = ref(true)
const error = ref(null)
const showEditModal = ref(false)
const selectedBooking = ref(null)

const fetchBookings = async () => {
    try {
        loading.value = true
        error.value = null
        
        const response = await fetch(`/api/calendar/student/${userStore.user.id}`, {
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

onMounted(async () => {
    await fetchBookings()
})
</script>

<style scoped>
.user-bookings {
    margin-bottom: var(--spacing-lg);
}

.loading-state {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--text-secondary);
}

.bookings-list {
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin-top: var(--spacing-md);
}

th, td {
    padding: var(--spacing-sm);
    text-align: left;
    border-bottom: 1px solid var(--border-color);
}

th {
    background-color: var(--background-light);
    font-weight: 500;
    color: var(--text-primary);
}

.actions {
    display: flex;
    gap: var(--spacing-sm);
}

@media (max-width: 768px) {
    table {
        font-size: var(--font-size-sm);
    }

    th, td {
        padding: var(--spacing-xs);
    }
}
</style> 