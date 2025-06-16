<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'

const userStore = useUserStore()
const packages = ref([])
const error = ref('')
const success = ref('')
const showAddForm = ref(false)
const showEditModal = ref(false)
const editingPackage = ref(null)
const loading = ref(true)

// New package form data
const newPackage = ref({
    name: '',
    price: '',
    credits: '',
    type: 'one-time',
    duration_days: null
})

const resetNewPackage = () => {
    newPackage.value = {
        name: '',
        price: '',
        credits: '',
        type: 'one-time',
        duration_days: null
    }
}

const fetchPackages = async () => {
    try {
        loading.value = true
        error.value = null
        
        const response = await fetch('/api/admin/packages', {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (!response.ok) {
            throw new Error('Failed to fetch packages')
        }
        
        const data = await response.json()
        packages.value = data
    } catch (err) {
        error.value = 'Error fetching packages: ' + err.message
        console.error('Error fetching packages:', err)
    } finally {
        loading.value = false
    }
}

const addPackage = async () => {
    if (!newPackage.value.name || !newPackage.value.price || !newPackage.value.credits) {
        error.value = 'Name, price, and credits are required'
        return
    }

    if (newPackage.value.type === 'membership' && !newPackage.value.duration_days) {
        error.value = 'Duration days is required for membership packages'
        return
    }

    try {
        const response = await fetch('/api/admin/packages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify(newPackage.value)
        })

        if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to create package')
        }

        success.value = 'Package created successfully'
        showAddForm.value = false
        resetNewPackage()
        await fetchPackages()
    } catch (err) {
        error.value = 'Error creating package: ' + err.message
    }
}

const updatePackage = async () => {
    if (!editingPackage.value.name || !editingPackage.value.price || !editingPackage.value.credits) {
        error.value = 'Name, price, and credits are required'
        return
    }

    if (editingPackage.value.type === 'membership' && !editingPackage.value.duration_days) {
        error.value = 'Duration days is required for membership packages'
        return
    }

    try {
        const response = await fetch(`/api/admin/packages/${editingPackage.value.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify(editingPackage.value)
        })

        if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to update package')
        }

        success.value = 'Package updated successfully'
        showEditModal.value = false
        await fetchPackages()
    } catch (err) {
        error.value = 'Error updating package: ' + err.message
    }
}

const deletePackage = async (packageId) => {
    if (!confirm('Are you sure you want to delete this package?')) return
    
    try {
        loading.value = true
        error.value = null
        
        const response = await fetch(`/api/admin/packages/${packageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (!response.ok) {
            throw new Error('Failed to delete package')
        }
        
        await fetchPackages()
        success.value = 'Package deleted successfully'
    } catch (err) {
        error.value = 'Error deleting package: ' + err.message
        console.error('Error deleting package:', err)
    } finally {
        loading.value = false
    }
}

const openEditModal = (editPackage) => {
    editingPackage.value = { ...editPackage }
    showEditModal.value = true
}

const closeEditModal = () => {
    editingPackage.value = null
    showEditModal.value = false
}

onMounted(fetchPackages)
</script>

<template>
    <div class="package-manager">
        <!-- Error and Success Messages -->
        <div v-if="error" class="error-message">
            {{ error }}
        </div>
        <div v-if="success" class="success-message">
            {{ success }}
        </div>

        <!-- Add Package Button -->
        <div class="actions">
            <button 
                class="form-button"
                @click="showAddForm = true"
            >
                Add New Package
            </button>
        </div>

        <!-- Add Package Modal -->
        <div v-if="showAddForm" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Package</h3>
                    <button class="modal-close" @click="showAddForm = false">&times;</button>
                </div>
                <div class="modal-body">
                    <form @submit.prevent="addPackage" class="package-form">
                        <div class="form-group">
                            <label class="form-label">Name:</label>
                            <input 
                                type="text" 
                                v-model="newPackage.name" 
                                class="form-input"
                                required
                            >
                        </div>

                        <div class="form-group">
                            <label class="form-label">Price:</label>
                            <input 
                                type="number" 
                                v-model="newPackage.price" 
                                class="form-input"
                                step="0.01" 
                                required
                            >
                        </div>

                        <div class="form-group">
                            <label class="form-label">Credits:</label>
                            <input 
                                type="number" 
                                v-model="newPackage.credits" 
                                class="form-input"
                                required
                            >
                        </div>

                        <div class="form-group">
                            <label class="form-label">Type:</label>
                            <select 
                                v-model="newPackage.type" 
                                class="form-input"
                                required
                            >
                                <option value="one-time">One-time</option>
                                <option value="membership">Membership</option>
                            </select>
                        </div>

                        <div class="form-group" v-if="newPackage.type === 'membership'">
                            <label class="form-label">Duration (days):</label>
                            <input 
                                type="number" 
                                v-model="newPackage.duration_days" 
                                class="form-input"
                                required
                            >
                        </div>

                        <div class="modal-footer">
                            <button 
                                type="button"
                                class="form-button form-button-cancel"
                                @click="showAddForm = false"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                class="form-button"
                            >
                                Create Package
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Packages List -->
        <div v-if="loading" class="loading-state">
            Loading packages...
        </div>
        <div v-else-if="packages.length === 0" class="no-packages">
            No packages found
        </div>
        <div v-else class="packages-list">
            <div v-for="pkg in packages" :key="pkg.id" class="package-card card">
                <div class="card-header">
                    <h3>{{ pkg.name }}</h3>
                    <p class="package-type">{{ pkg.type === 'membership' ? 'Membership' : 'One-time' }}</p>
                </div>
                <div class="card-body">
                    <div class="package-info">
                        <p class="price">${{ pkg.price }}</p>
                        <p class="credits">{{ pkg.credits }} credits</p>
                        <p v-if="pkg.type === 'membership'" class="duration">
                            Duration: {{ pkg.duration_days }} days
                        </p>
                    </div>
                    <div class="package-actions">
                        <button 
                            class="form-button form-button-edit"
                            @click="openEditModal(pkg)"
                        >
                            Edit
                        </button>
                        <button 
                            class="form-button form-button-danger"
                            @click="deletePackage(pkg.id)"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Edit Modal -->
        <div v-if="showEditModal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Package</h3>
                </div>
                
                <div class="modal-body">
                    <form @submit.prevent="updatePackage">
                        <div class="form-group">
                            <label class="form-label">Name:</label>
                            <input 
                                type="text" 
                                v-model="editingPackage.name" 
                                class="form-input"
                                required
                            >
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Type:</label>
                            <select 
                                v-model="editingPackage.type" 
                                class="form-input"
                                required
                            >
                                <option value="credits">Credits</option>
                                <option value="membership">Membership</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Price:</label>
                            <input 
                                type="number" 
                                v-model="editingPackage.price" 
                                class="form-input"
                                min="0"
                                step="0.01"
                                required
                            >
                        </div>
                        
                        <div class="form-group" v-if="editingPackage.type === 'credits'">
                            <label class="form-label">Credits:</label>
                            <input 
                                type="number" 
                                v-model="editingPackage.credits" 
                                class="form-input"
                                min="1"
                                required
                            >
                        </div>
                        
                        <div class="form-group" v-if="editingPackage.type === 'membership'">
                            <label class="form-label">Duration (days):</label>
                            <input 
                                type="number" 
                                v-model="editingPackage.duration_days" 
                                class="form-input"
                                min="1"
                                required
                            >
                        </div>
                        
                        <div class="modal-footer">
                            <button 
                                class="form-button form-button-cancel"
                                @click="closeEditModal"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                class="form-button"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.package-manager {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg);
}

.error-message {
    background-color: var(--error-color);
    color: white;
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-md);
    border-radius: var(--border-radius);
}

.success-message {
    background-color: var(--success-color);
    color: white;
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-md);
    border-radius: var(--border-radius);
}

.actions {
    margin-bottom: var(--spacing-lg);
}

.packages-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--spacing-lg);
    margin-top: var(--spacing-lg);
}

.package-card {
    background: var(--background-light);
    border-radius: var(--border-radius);
    box-shadow: var(--card-shadow);
}

.card-header {
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
}

.card-header h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.2rem;
}

.package-type {
    margin: var(--spacing-xs) 0 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.card-body {
    padding: var(--spacing-md);
}

.package-info {
    margin-bottom: var(--spacing-md);
}

.price {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--secondary-color);
    margin: var(--spacing-sm) 0;
}

.credits,
.duration {
    margin: var(--spacing-sm) 0;
    color: var(--text-color);
}

.package-actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-md);
}

.loading-state,
.no-packages {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--text-muted);
}

.package-form {
    display: grid;
    gap: var(--spacing-md);
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.form-label {
    font-weight: 500;
    color: var(--text-primary);
}

.form-input {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background-color: var(--background-light);
}

.form-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-color-light);
}
</style> 