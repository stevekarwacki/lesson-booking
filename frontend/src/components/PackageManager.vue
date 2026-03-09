<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { usePackages } from '../composables/usePackages'
import { useFormFeedback } from '../composables/useFormFeedback'
import TabbedModal from './TabbedModal.vue'
import TabbedModalTab from './TabbedModalTab.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
        <Modal
            v-model:open="showAddForm"
            title="Add New Package"
            description="Create a new payment package for students to purchase."
            save-text="Create Package"
            @save="addPackage"
            @cancel="showAddForm = false"
        >
            <div class="modal-form">
                <div class="form-group form-group-horizontal-modal">
                    <Label for="newPackageName" class="form-label">
                        Package Name <span class="required">*</span>
                    </Label>
                    <div class="form-input-wrapper-modal">
                        <Input 
                            id="newPackageName"
                            type="text" 
                            v-model="newPackage.name"
                            placeholder="e.g., Starter Pack, Premium Membership"
                            required
                        />
                    </div>
                </div>

                <div class="form-group form-group-horizontal-modal">
                    <Label for="newPackageType" class="form-label">
                        Package Type <span class="required">*</span>
                    </Label>
                    <div class="form-input-wrapper-modal">
                        <Select v-model="newPackage.type" required>
                            <SelectTrigger id="newPackageType">
                                <SelectValue placeholder="Select package type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="one-time">One-time Purchase</SelectItem>
                                <SelectItem value="membership">Recurring Membership</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div class="form-group form-group-horizontal-modal">
                    <Label for="newPackagePrice" class="form-label">
                        Price <span class="required">*</span>
                    </Label>
                    <div class="form-input-wrapper-modal">
                        <div class="price-input-group">
                            <span class="price-prefix">$</span>
                            <Input 
                                id="newPackagePrice"
                                type="number" 
                                v-model="newPackage.price"
                                class="price-input"
                                step="0.01"
                                min="0"
                                placeholder="0.00" 
                                required
                            />
                        </div>
                    </div>
                </div>

                <div v-if="newPackage.type === 'one-time'" class="form-group form-group-horizontal-modal">
                    <Label for="newPackageCredits" class="form-label">
                        Lesson Credits <span class="required">*</span>
                    </Label>
                    <div class="form-input-wrapper-modal">
                        <Input 
                            id="newPackageCredits"
                            type="number" 
                            v-model="newPackage.credits"
                            min="1"
                            placeholder="1"
                            required
                        />
                    </div>
                </div>

                <div v-if="newPackage.type === 'one-time'" class="form-group form-group-horizontal-modal">
                    <Label for="newPackageLessonDuration" class="form-label">
                        Lesson Duration <span class="required">*</span>
                    </Label>
                    <div class="form-input-wrapper-modal">
                        <Select v-model.number="newPackage.lesson_duration_minutes" required>
                            <SelectTrigger id="newPackageLessonDuration">
                                <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem :value="30">30 Minutes</SelectItem>
                                <SelectItem :value="60">60 Minutes</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div v-if="newPackage.type === 'membership'" class="form-group form-group-horizontal-modal">
                    <Label for="newPackageDuration" class="form-label">
                        Billing Period <span class="required">*</span>
                    </Label>
                    <div class="form-input-wrapper-modal">
                        <Input 
                            id="newPackageDuration"
                            type="number" 
                            v-model="newPackage.duration_days"
                            min="1"
                            placeholder="30"
                            required
                        />
                        <p class="help-text">Number of days between billing cycles</p>
                    </div>
                </div>
            </div>
        </Modal>

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
                <Card>
                    <CardHeader>
                        <CardTitle>Package Configuration</CardTitle>
                        <CardDescription>
                            Configure pricing, credits, and package type settings.
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                        <form @submit.prevent="handleUpdatePackage" class="package-form-horizontal">
                            <div class="subsection">
                                <div class="form-group form-group-horizontal">
                                    <Label for="editPackageName" class="form-label">
                                        Package Name <span class="required">*</span>
                                    </Label>
                                    <div class="form-input-wrapper">
                                        <Input 
                                            id="editPackageName"
                                            type="text" 
                                            v-model="editingPackage.name"
                                            placeholder="e.g., Starter Pack, Premium Membership"
                                            required
                                        />
                                        <p class="help-text">Choose a descriptive name that clearly indicates what the package offers</p>
                                    </div>
                                </div>
                                
                                <div class="form-group form-group-horizontal">
                                    <Label for="editPackageType" class="form-label">
                                        Package Type <span class="required">*</span>
                                    </Label>
                                    <div class="form-input-wrapper">
                                        <Select v-model="editingPackage.type" required>
                                            <SelectTrigger id="editPackageType">
                                                <SelectValue placeholder="Select package type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="one-time">
                                                    <div class="select-item-content">
                                                        <span>One-time Purchase</span>
                                                        <span class="description">Provide lesson credits immediately</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="membership">
                                                    <div class="select-item-content">
                                                        <span>Recurring Membership</span>
                                                        <span class="description">Provide recurring access with weekly bookings</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                
                                <div class="form-group form-group-horizontal">
                                    <Label for="editPackagePrice" class="form-label">
                                        Price <span class="required">*</span>
                                    </Label>
                                    <div class="form-input-wrapper">
                                        <div class="price-input-group">
                                            <span class="price-prefix">$</span>
                                            <Input 
                                                id="editPackagePrice"
                                                type="number" 
                                                v-model="editingPackage.price"
                                                class="price-input"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                        <p class="help-text">
                                            Set the {{ editingPackage.type === 'membership' ? 'monthly' : 'one-time' }} price for this package
                                        </p>
                                    </div>
                                </div>
                                
                                <div v-if="editingPackage.type === 'one-time'" class="form-group form-group-horizontal">
                                    <Label for="editPackageCredits" class="form-label">
                                        Lesson Credits <span class="required">*</span>
                                    </Label>
                                    <div class="form-input-wrapper">
                                        <Input 
                                            id="editPackageCredits"
                                            type="number" 
                                            v-model="editingPackage.credits"
                                            min="1"
                                            placeholder="1"
                                            required
                                        />
                                        <p class="help-text">Number of lesson credits included with this package</p>
                                    </div>
                                </div>

                                <div v-if="editingPackage.type === 'one-time'" class="form-group form-group-horizontal">
                                    <Label for="editPackageLessonDuration" class="form-label">
                                        Lesson Duration <span class="required">*</span>
                                    </Label>
                                    <div class="form-input-wrapper">
                                        <Select v-model.number="editingPackage.lesson_duration_minutes" required>
                                            <SelectTrigger id="editPackageLessonDuration">
                                                <SelectValue placeholder="Select duration" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem :value="30">30 Minutes</SelectItem>
                                                <SelectItem :value="60">60 Minutes</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p class="help-text">Duration of lessons this package provides credits for</p>
                                    </div>
                                </div>
                                
                                <div v-if="editingPackage.type === 'membership'" class="form-group form-group-horizontal">
                                    <Label for="editPackageDuration" class="form-label">
                                        Billing Period <span class="required">*</span>
                                    </Label>
                                    <div class="form-input-wrapper">
                                        <Input 
                                            id="editPackageDuration"
                                            type="number" 
                                            v-model="editingPackage.duration_days"
                                            min="1"
                                            placeholder="30"
                                            required
                                        />
                                        <p class="help-text">
                                            How often the membership renews (typically 30 days for monthly memberships)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div v-if="editingPackage.name && editingPackage.price" class="package-preview">
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

                            <div v-if="error" class="alert alert-error">
                                {{ error }}
                            </div>

                            <div v-if="success" class="alert alert-success">
                                {{ success }}
                            </div>
                            
                            <div class="button-group">
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
                    </CardContent>
                </Card>
            </TabbedModalTab>

            <TabbedModalTab label="Actions">
                <div class="actions-tab">
                    <Card>
                        <CardHeader>
                            <CardTitle>Package Management</CardTitle>
                            <CardDescription>
                                Perform administrative actions on this payment package.
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent>
                            <div class="subsection">
                                <h3 class="subsection-header">Package Information</h3>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <span class="info-label">Package ID</span>
                                        <span class="info-value">{{ editingPackage?.id }}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Package Type</span>
                                        <span class="package-type-badge">{{ editingPackage?.type === 'membership' ? 'Membership' : 'One-time' }}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Current Price</span>
                                        <span class="info-value">${{ editingPackage?.price }}</span>
                                    </div>
                                    <div v-if="editingPackage?.type === 'one-time'" class="info-item">
                                        <span class="info-label">Credits</span>
                                        <span class="info-value">{{ editingPackage?.credits }} Pre-paid {{ editingPackage?.lesson_duration_minutes || 30 }}-Minute Lessons</span>
                                    </div>
                                </div>
                            </div>

                            <div class="section-divider"></div>

                            <div class="subsection">
                                <div class="danger-zone">
                                    <div class="danger-zone-content">
                                        <div class="danger-zone-info">
                                            <strong>Delete Package</strong>
                                            <p>Permanently remove this package from the system. Users with active subscriptions or purchased credits will not be affected.</p>
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
                        </CardContent>
                    </Card>
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

/* Price Input */
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

/* Package Preview */
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

/* Alerts */
.alert {
    padding: 0.75rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
}

.alert-error {
    background: #fee2e2;
    border: 1px solid #fca5a5;
    color: #991b1b;
}

.alert-success {
    background: #d1fae5;
    border: 1px solid #6ee7b7;
    color: #065f46;
}

/* Actions Tab */
.actions-tab {
    padding: var(--spacing-lg);
}

.info-grid {
    display: grid;
    gap: 1rem;
    background: var(--background-secondary, #f9fafb);
    padding: 1rem;
    border-radius: 6px;
}

.info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.info-label {
    font-weight: 500;
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
}

.info-value {
    color: var(--text-primary, #111827);
    font-weight: 500;
}

.package-type-badge {
    padding: 0.25rem 0.5rem;
    background: var(--primary-color, #3b82f6);
    color: white;
    border-radius: var(--border-radius);
    font-size: var(--font-size-sm);
    font-weight: 500;
}

.danger-zone {
    padding: 1.5rem;
    border: 2px solid var(--error-color, #ef4444);
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.02);
}

.danger-zone-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.danger-zone-info strong {
    display: block;
    font-size: 1rem;
    margin-bottom: 0.5rem;
    color: var(--text-primary, #111827);
}

.danger-zone-info > p {
    margin: 0;
    color: var(--text-secondary, #6b7280);
}

/* Package List */
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
</style> 