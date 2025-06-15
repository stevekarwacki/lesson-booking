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
                class="btn btn-primary" 
                @click="showAddForm = !showAddForm"
            >
                {{ showAddForm ? 'Cancel' : 'Add New Package' }}
            </button>
        </div>

        <!-- Add Package Form -->
        <div v-if="showAddForm" class="form-container">
            <h2>Add New Package</h2>
            <form @submit.prevent="addPackage" class="package-form">
                <div class="form-group">
                    <label for="name">Name:</label>
                    <input 
                        type="text" 
                        id="name" 
                        v-model="newPackage.name" 
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="price">Price:</label>
                    <input 
                        type="number" 
                        id="price" 
                        v-model="newPackage.price" 
                        step="0.01" 
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="credits">Credits:</label>
                    <input 
                        type="number" 
                        id="credits" 
                        v-model="newPackage.credits" 
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="type">Type:</label>
                    <select 
                        id="type" 
                        v-model="newPackage.type" 
                        required
                    >
                        <option value="one-time">One-time</option>
                        <option value="membership">Membership</option>
                    </select>
                </div>

                <div class="form-group" v-if="newPackage.type === 'membership'">
                    <label for="duration_days">Duration (days):</label>
                    <input 
                        type="number" 
                        id="duration_days" 
                        v-model="newPackage.duration_days" 
                        required
                    >
                </div>

                <button type="submit" class="btn btn-primary">Create Package</button>
            </form>
        </div>

        <!-- Packages List -->
        <div v-if="loading" class="loading">
            Loading packages...
        </div>
        <div v-else-if="packages.length === 0" class="no-packages">
            No packages found
        </div>
        <div v-else class="packages-list">
            <div v-for="pkg in packages" :key="pkg.id" class="package-card">
                <div class="package-info">
                    <h3>{{ pkg.name }}</h3>
                    <p class="price">${{ pkg.price }}</p>
                    <p class="credits">{{ pkg.credits }} credits</p>
                    <p class="type">{{ pkg.type }}</p>
                    <p v-if="pkg.type === 'membership'" class="duration">
                        Duration: {{ pkg.duration_days }} days
                    </p>
                </div>
                <div class="package-actions">
                    <button 
                        class="btn btn-secondary" 
                        @click="openEditModal(pkg)"
                    >
                        Edit
                    </button>
                    <button 
                        class="btn btn-danger" 
                        @click="deletePackage(pkg.id)"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>

        <!-- Edit Modal -->
        <div v-if="showEditModal" class="modal">
            <div class="modal-content">
                <h2>Edit Package</h2>
                <form @submit.prevent="updatePackage" class="package-form">
                    <div class="form-group">
                        <label for="edit-name">Name:</label>
                        <input 
                            type="text" 
                            id="edit-name" 
                            v-model="editingPackage.name" 
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="edit-price">Price:</label>
                        <input 
                            type="number" 
                            id="edit-price" 
                            v-model="editingPackage.price" 
                            step="0.01" 
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="edit-credits">Credits:</label>
                        <input 
                            type="number" 
                            id="edit-credits" 
                            v-model="editingPackage.credits" 
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="edit-type">Type:</label>
                        <select 
                            id="edit-type" 
                            v-model="editingPackage.type" 
                            required
                        >
                            <option value="one-time">One-time</option>
                            <option value="membership">Membership</option>
                        </select>
                    </div>

                    <div class="form-group" v-if="editingPackage.type === 'membership'">
                        <label for="edit-duration_days">Duration (days):</label>
                        <input 
                            type="number" 
                            id="edit-duration_days" 
                            v-model="editingPackage.duration_days" 
                            required
                        >
                    </div>

                    <div class="modal-footer">
                        <button 
                            type="button"
                            class="form-button form-button-secondary"
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
</template>

<style scoped>
.package-manager {
    position: relative;
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

.form-container {
    background-color: var(--background-color);
    padding: var(--spacing-lg);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-lg);
}

.package-form {
    display: grid;
    gap: var(--spacing-md);
    max-width: 500px;
}

.form-group label {
    font-weight: bold;
}

.form-group input,
.form-group select {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
}

.packages-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--spacing-lg);
}

.package-card {
    background-color: var(--background-color);
    padding: var(--spacing-lg);
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
}

.package-info {
    margin-bottom: var(--spacing-md);
}

.package-info h3 {
    margin: 0 0 var(--spacing-sm);
    color: var(--primary-color);
}

.price {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--secondary-color);
    margin: var(--spacing-sm) 0;
}

.credits,
.type,
.duration {
    margin: var(--spacing-sm) 0;
    color: var(--text-color);
}

.package-actions {
    display: flex;
    gap: var(--spacing-sm);
}

.modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background-color: white;
    padding: var(--spacing-lg);
    border-radius: var(--border-radius);
    max-width: 500px;
    width: 100%;
}

.modal-footer {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-lg);
    justify-content: flex-end;
}

.loading,
.no-packages {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--text-color);
}
</style> 