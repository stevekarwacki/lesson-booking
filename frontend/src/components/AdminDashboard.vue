<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'

const userStore = useUserStore()
const stats = ref({
    totalUsers: 0,
    totalInstructors: 0,
    totalBookings: 0,
    totalRevenue: 0
})
const loading = ref(true)
const error = ref(null)

const fetchStats = async () => {
    try {
        loading.value = true
        error.value = null

        const response = await fetch('/api/admin/stats', {
            headers: {
                'user-id': userStore.user.id
            }
        })

        if (!response.ok) {
            throw new Error('Failed to fetch stats')
        }

        const data = await response.json()
        stats.value = data
    } catch (err) {
        error.value = 'Error fetching stats: ' + err.message
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    await fetchStats()
})
</script>

<template>
    <div class="admin-dashboard">
        <h1>Admin Dashboard</h1>
        
        <div v-if="loading" class="loading">
            Loading dashboard data...
        </div>
        
        <div v-else-if="error" class="error">
            {{ error }}
        </div>
        
        <div v-else class="stats-grid">
            <div class="stat-card">
                <h3>Total Users</h3>
                <p>{{ stats.totalUsers }}</p>
            </div>
            
            <div class="stat-card">
                <h3>Total Instructors</h3>
                <p>{{ stats.totalInstructors }}</p>
            </div>
            
            <div class="stat-card">
                <h3>Total Bookings</h3>
                <p>{{ stats.totalBookings }}</p>
            </div>
            
            <div class="stat-card">
                <h3>Total Revenue</h3>
                <p>${{ stats.totalRevenue.toFixed(2) }}</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.admin-dashboard {
    padding: 20px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.stat-card {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-card h3 {
    margin: 0 0 10px 0;
    color: #666;
}

.stat-card p {
    font-size: 24px;
    font-weight: bold;
    margin: 0;
    color: #333;
}

.loading, .error {
    text-align: center;
    padding: 20px;
    color: #666;
}

.error {
    color: #dc3545;
}
</style> 