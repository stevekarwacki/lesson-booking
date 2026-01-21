<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { usePackages } from '../composables/usePackages'
import { useFormFeedback } from '../composables/useFormFeedback'
import TabbedModal from './TabbedModal.vue'
import TabbedModalTab from './TabbedModalTab.vue'
import { Button } from '@/components/ui/button'

const userStore = useUserStore()
const { showSuccess, showError } = useFormFeedback()
const {
    packages,
    isLoadingPackages,
    createPackage,
    updatePackage,
    deletePackage,
    isCreatingPackage,
    isUpdatingPackage,
    isDeletingPackage
} = usePackages()

const showAddForm = ref(false)
const showEditModal = ref(false)
const editingPackage = ref(null)
const loading = isLoadingPackages

// New package form data
const newPackage = ref({
    name: '',
    price: '',
    credits: '',
    type: 'one-time',
    duration_days: null,
    lesson_duration_minutes: 30
})

const resetNewPackage = () => {
    newPackage.value = {
        name: '',
        price: '',
        credits: '',
        type: 'one-time',
        duration_days: null,
        lesson_duration_minutes: 30
    }
}

// Packages are automatically fetched via usePackages composable

const addPackage = async () => {
    if (!newPackage.value.name || !newPackage.value.price) {
        showError('Name and price are required')
        return
    }

    if (newPackage.value.type === 'one-time' && !newPackage.value.credits) {
        showError('Credits are required for one-time packages')
        return
    }

    if (newPackage.value.type === 'membership' && !newPackage.value.duration_days) {
        showError('Duration days is required for membership packages')
        return
    }

    try {
        await createPackage(newPackage.value)
        
        showSuccess('Package created successfully')
        showAddForm.value = false
        resetNewPackage()
    } catch (err) {
        showError(err.message || 'Failed to create package')
    }
}

const handleUpdatePackage = async () => {
    if (!editingPackage.value.name || !editingPackage.value.price) {
        showError('Name and price are required')
        return
    }

    if (editingPackage.value.type === 'one-time' && !editingPackage.value.credits) {
        showError('Credits are required for one-time packages')
        return
    }

    if (editingPackage.value.type === 'membership' && !editingPackage.value.duration_days) {
        showError('Duration days is required for membership packages')
        return
    }

    try {
        await updatePackage({
            packageId: editingPackage.value.id,
            packageData: editingPackage.value
        })
        
        showSuccess('Package updated successfully')
        showEditModal.value = false
    } catch (err) {
        showError(err.message || 'Failed to update package')
    }
}

const handleDeletePackage = async (packageId) => {
    if (!confirm('Are you sure you want to delete this package?')) return
    
    try {
        await deletePackage(packageId)
        showSuccess('Package deleted successfully')
    } catch (err) {
        showError(err.message || 'Failed to delete package')
    }
}

const deletePackageFromModal = async () => {
    if (!confirm('Are you sure you want to delete this package? This action cannot be undone and will permanently remove the package from the system.')) {
        return
    }
    
    try {
        await deletePackage(editingPackage.value.id)
        
        showSuccess('Package deleted successfully')
        closeEditModal()
    } catch (err) {
        showError(err.message || 'Failed to delete package')
    }
}

const openEditModal = (editPackage) => {
    editingPackage.value = { 
        ...editPackage,
        // Ensure lesson_duration_minutes is a number, default to 30 if not set
        lesson_duration_minutes: editPackage.lesson_duration_minutes || 30
    }
    showEditModal.value = true
}

const closeEditModal = () => {
    editingPackage.value = null
    showEditModal.value = false
}

// Packages are automatically fetched by usePackages composable
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
            <Button 
                @click="showAddForm = true"
            >
                Add New Package
            </Button>
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
                            <div class="form-input">
                                <input 
                                    type="text" 
                                    v-model="newPackage.name" 
                                    class="form-input"
                                    required
                                >
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Price:</label>
                            <div class="form-input">
                                <input 
                                    type="number" 
                                    v-model="newPackage.price" 
                                    class="form-input"
                                    step="0.01" 
                                    required
                                >
                            </div>
                        </div>

                        <div class="form-group" v-if="newPackage.type === 'one-time'">
                            <label class="form-label">Credits:</label>
                            <div class="form-input">
                                <input 
                                    type="number" 
                                    v-model="newPackage.credits" 
                                    class="form-input"
                                    required
                                >
                            </div>
                        </div>

                        <div class="form-group" v-if="newPackage.type === 'one-time'">
                            <label class="form-label">Lesson Duration:</label>
                            <div class="form-input">
                                <select 
                                    v-model.number="newPackage.lesson_duration_minutes" 
                                    class="form-input"
                                    required
                                >
                                    <option :value="30">30 Minutes</option>
                                    <option :value="60">60 Minutes</option>
                                </select>
                            </div>
                            <small class="form-text">
                                Duration of lessons this package provides credits for
                            </small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Type:</label>
                            <div class="form-input">
                                <select 
                                    v-model="newPackage.type" 
                                    class="form-input"
                                    required
                                >
                                    <option value="one-time">One-time</option>
                                    <option value="membership">Membership</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group" v-if="newPackage.type === 'membership'">
                            <label class="form-label">Duration (days):</label>
                            <div class="form-input">
                                <input 
                                    type="number" 
                                    v-model="newPackage.duration_days" 
                                    class="form-input"
                                    required
                                >
                            </div>
                        </div>

                        <div class="modal-footer">
                            <Button 
                                type="button"
                                variant="outline"
                                @click="showAddForm = false"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit"
                            >
                                Create Package
                            </Button>
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
                        <p v-if="pkg.type === 'one-time'" class="credits">
                            {{ pkg.credits }} Pre-paid {{ pkg.lesson_duration_minutes || 30 }}-Minute Lessons
                        </p>
                        <p v-if="pkg.type === 'membership'" class="duration">
                            Duration: {{ pkg.duration_days }} days
                        </p>
                    </div>
                    <div class="package-actions">
                        <Button 
                            variant="secondary"
                            @click="openEditModal(pkg)"
                        >
                            Manage
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Edit Modal -->
        <TabbedModal
            :show="showEditModal && !!editingPackage"
            :title="`Manage Package: ${editingPackage?.name || 'Unknown'}`"
            @close="closeEditModal"
        >
            <TabbedModalTab label="Package Details">
                <form @submit.prevent="handleUpdatePackage">
                    <div class="form-group">
                        <label class="form-label" for="editPackageName">Package Name:</label>
                        <div class="form-input">
                            <input 
                                id="editPackageName"
                                type="text" 
                                v-model="editingPackage.name" 
                                class="form-input"
                                placeholder="e.g., Starter Pack, Premium Membership"
                                required
                            >
                            <small class="form-text">Choose a descriptive name that clearly indicates what the package offers</small>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="editPackageType">Package Type:</label>
                        <div class="form-input">
                            <select 
                                id="editPackageType"
                                v-model="editingPackage.type" 
                                class="form-input"
                                required
                            >
                                <option value="one-time">One-time Purchase</option>
                                <option value="membership">Recurring Membership</option>
                            </select>
                            <small class="form-text">
                                One-time packages provide lesson credits immediately. 
                                Memberships provide recurring access with weekly bookings.
                            </small>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="editPackagePrice">Price (USD):</label>
                        <div class="form-input">
                            <div class="price-input-group">
                                <span class="price-prefix">$</span>
                                <input 
                                    id="editPackagePrice"
                                    type="number" 
                                    v-model="editingPackage.price" 
                                    class="form-input price-input"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    required
                                >
                            </div>
                            <small class="form-text">
                                Set the {{ editingPackage.type === 'membership' ? 'monthly' : 'one-time' }} price for this package
                            </small>
                        </div>
                    </div>
                    
                    <div class="form-group" v-if="editingPackage.type === 'one-time'">
                        <label class="form-label" for="editPackageCredits">Lesson Credits:</label>
                        <div class="form-input">
                            <input 
                                id="editPackageCredits"
                                type="number" 
                                v-model="editingPackage.credits" 
                                class="form-input"
                                min="1"
                                placeholder="1"
                                required
                            >
                            <small class="form-text">Number of lesson credits included with this package</small>
                        </div>
                    </div>

                    <div class="form-group" v-if="editingPackage.type === 'one-time'">
                        <label class="form-label" for="editPackageLessonDuration">Lesson Duration:</label>
                        <div class="form-input">
                            <select 
                                id="editPackageLessonDuration"
                                v-model.number="editingPackage.lesson_duration_minutes" 
                                class="form-input"
                                required
                            >
                                <option :value="30">30 Minutes</option>
                                <option :value="60">60 Minutes</option>
                            </select>
                            <small class="form-text">Duration of lessons this package provides credits for</small>
                        </div>
                    </div>
                    

                    
                    <div class="form-group" v-if="editingPackage.type === 'membership'">
                        <label class="form-label" for="editPackageDuration">Billing Period (days):</label>
                        <div class="form-input">
                            <input 
                                id="editPackageDuration"
                                type="number" 
                                v-model="editingPackage.duration_days" 
                                class="form-input"
                                min="1"
                                placeholder="30"
                                required
                            >
                            <small class="form-text">
                                How often the membership renews (typically 30 days for monthly memberships)
                            </small>
                        </div>
                    </div>

                    <div class="package-preview" v-if="editingPackage.name && editingPackage.price">
                        <h4>Package Preview</h4>
                        <div class="preview-card">
                            <div class="preview-header">
                                <h5>{{ editingPackage.name }}</h5>
                                <span class="preview-type">{{ editingPackage.type === 'membership' ? 'Membership' : 'One-time' }}</span>
                            </div>
                            <div class="preview-details">
                                <p class="preview-price">${{ editingPackage.price }}</p>
                                <p v-if="editingPackage.type === 'one-time'" class="preview-credits">
                                    {{ editingPackage.credits }} Pre-paid {{ editingPackage.lesson_duration_minutes || 30 }}-Minute Lessons
                                </p>
                                <p v-if="editingPackage.type === 'membership'" class="preview-duration">
                                    Renews every {{ editingPackage.duration_days }} days
                                </p>
                            </div>
                        </div>
                    </div>

                    <div v-if="error" class="form-message error-message">
                        {{ error }}
                    </div>

                    <div v-if="success" class="form-message success-message">
                        {{ success }}
                    </div>
                    
                    <div class="form-actions">
                        <Button 
                            type="button"
                            variant="outline"
                            @click="closeEditModal"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit"
                        >
                            Save Changes
                        </Button>
                    </div>
                </form>
            </TabbedModalTab>

            <TabbedModalTab label="Actions">
                <div class="actions-tab">
                    <div class="actions-section">
                        <h4>Package Management</h4>
                        <p>Perform administrative actions on this payment package.</p>
                        
                        <div class="action-group">
                            <h5>Package Information</h5>
                            <div class="action-item">
                                <div class="action-info">
                                    <strong>Package ID:</strong> {{ editingPackage?.id }}
                                </div>
                                <div class="action-info">
                                    <strong>Package Type:</strong> 
                                    <span class="package-type-badge">{{ editingPackage?.type === 'membership' ? 'Membership' : 'One-time' }}</span>
                                </div>
                                <div class="action-info">
                                    <strong>Current Price:</strong> ${{ editingPackage?.price }}
                                </div>
                                <div v-if="editingPackage?.type === 'one-time'" class="action-info">
                                    <strong>Credits:</strong> {{ editingPackage?.credits }} Pre-paid {{ editingPackage?.lesson_duration_minutes || 30 }}-Minute Lessons
                                </div>
                            </div>
                        </div>

                        <div class="action-group danger-zone">
                            <h5>Danger Zone</h5>
                            <div class="action-item">
                                <div class="action-info">
                                    <strong>Delete Package</strong>
                                </div>
                                <div class="action-description">
                                    <p>Permanently remove this package from the system. This action cannot be undone.</p>
                                    <p><strong>Warning:</strong> Deleting this package will:</p>
                                    <ul>
                                        <li>Remove it from the available packages list</li>
                                        <li>Prevent new purchases of this package</li>
                                        <li>Not affect existing subscriptions or purchased credits</li>
                                        <li>Remove all package configuration and pricing history</li>
                                    </ul>
                                    <p><strong>Note:</strong> If users have active subscriptions with this package, consider deactivating instead of deleting.</p>
                                </div>
                                <Button 
                                    type="button"
                                    variant="destructive"
                                    @click="deletePackageFromModal"
                                >
                                    Delete Package
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </TabbedModalTab>
        </TabbedModal>
    </div>
</template>

<style scoped>
.package-manager {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg);
}

/* TabbedModal specific styles */
.price-input-group {
    position: relative;
    display: flex;
    align-items: center;
}

.price-prefix {
    position: absolute;
    left: var(--spacing-sm);
    color: var(--text-secondary);
    font-weight: 500;
    z-index: 1;
}

.price-input {
    padding-left: calc(var(--spacing-sm) + 1rem) !important;
}

.package-preview {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-md);
    background: var(--background-hover);
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color);
}

.package-preview h4 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--primary-color);
    font-size: var(--font-size-lg);
}

.preview-card {
    background: white;
    border-radius: var(--border-radius);
    padding: var(--spacing-md);
    box-shadow: var(--card-shadow);
}

.preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
}

.preview-header h5 {
    margin: 0;
    color: var(--text-primary);
    font-size: var(--font-size-md);
}

.preview-type {
    padding: 0.25rem 0.5rem;
    background: var(--primary-color);
    color: white;
    border-radius: var(--border-radius);
    font-size: var(--font-size-sm);
    font-weight: 500;
}

.preview-details p {
    margin: var(--spacing-xs) 0;
    color: var(--text-secondary);
}

.preview-price {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--primary-color) !important;
}

.preview-credits {
    font-weight: 500;
    color: var(--success-color) !important;
}

.analytics-tab,
.settings-tab {
    min-height: 300px;
    padding: var(--spacing-lg);
}

.info-message {
    text-align: center;
    padding: var(--spacing-lg);
    background: var(--background-hover);
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color);
}

.info-message h4 {
    margin-top: 0;
    margin-bottom: var(--spacing-md);
    color: var(--primary-color);
}

.info-message p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-sm);
}

.info-message ul {
    text-align: left;
    max-width: 500px;
    margin: var(--spacing-md) auto 0;
    color: var(--text-secondary);
}

.info-message li {
    margin-bottom: var(--spacing-xs);
}

.form-text {
    display: block;
    margin-top: var(--spacing-xs);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
}

/* Actions tab styles */
.actions-tab {
    min-height: 300px;
    padding: var(--spacing-lg);
}

.actions-section {
    max-width: 600px;
    margin: 0 auto;
}

.actions-section h4 {
    margin-top: 0;
    margin-bottom: var(--spacing-sm);
    color: var(--primary-color);
}

.actions-section > p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-lg);
}

.action-group {
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
}

.action-group h5 {
    margin-top: 0;
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
    font-size: var(--font-size-md);
}

.action-item {
    padding: var(--spacing-md);
    background: var(--background-light);
    border-radius: var(--border-radius);
}

.action-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
}

.action-info strong {
    color: var(--text-primary);
}

.package-type-badge {
    padding: 0.25rem 0.5rem;
    background: var(--primary-color);
    color: white;
    border-radius: var(--border-radius);
    font-size: var(--font-size-sm);
    font-weight: 500;
}

.action-description {
    margin-bottom: var(--spacing-md);
}

.action-description p {
    margin: var(--spacing-xs) 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
}

.action-description ul {
    margin: var(--spacing-sm) 0;
    padding-left: var(--spacing-lg);
    color: var(--text-secondary);
}

.action-description li {
    margin-bottom: var(--spacing-xs);
}

.danger-zone {
    border-color: var(--error-color);
    background: rgba(255, 0, 0, 0.02);
}

.danger-zone h5 {
    color: var(--error-color);
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