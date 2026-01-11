<script setup>
import { ref, computed } from 'vue'
import { useFormFeedback } from '../composables/useFormFeedback'
import { useProfileUpdate } from '../composables/useProfileUpdate'
import { validateProfileData } from '../utils/formValidation'

const emit = defineEmits(['verification-complete'])

const { showSuccess, showError } = useFormFeedback()
const { updateProfileAsync, isUpdating } = useProfileUpdate()

// Form fields
const phoneNumber = ref('')
const addressLine1 = ref('')
const addressLine2 = ref('')
const city = ref('')
const state = ref('')
const zip = ref('')
const isMinor = ref(false)
const parentApproval = ref(false)

// Form state
const fieldErrors = ref({})

// US States for dropdown
const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

// Show parent approval checkbox only if user is a minor
const showParentApproval = computed(() => isMinor.value === true)

const handleSubmit = async () => {
    // Validate form using helper
    const validation = validateProfileData({
        phone_number: phoneNumber.value,
        address_line_1: addressLine1.value,
        city: city.value,
        state: state.value,
        zip: zip.value,
        is_minor: isMinor.value,
        parent_approval: parentApproval.value
    })
    
    if (!validation.valid) {
        fieldErrors.value = validation.errors
        showError('Please fix the errors below')
        return
    }
    
    // Clear any previous errors
    fieldErrors.value = {}
    
    try {
        const verificationData = {
            phone_number: phoneNumber.value.trim(),
            is_student_minor: isMinor.value,
            address: {
                line_1: addressLine1.value.trim(),
                line_2: addressLine2.value.trim() || null,
                city: city.value.trim(),
                state: state.value,
                zip: zip.value.trim()
            }
        }
        
        // Add parent approval if minor
        if (isMinor.value === true) {
            verificationData.parent_approval = parentApproval.value
        }
        
        // Submit using Vue Query mutation
        const data = await updateProfileAsync(verificationData)
        
        showSuccess('Verification data submitted successfully!')
        
        // Emit event to parent
        emit('verification-complete', data.verification_status)
        
    } catch (error) {
        // Check if it's a validation error from backend
        if (error.message && error.message.includes('Validation failed')) {
            showError('Please fix the errors below')
        } else {
            showError(error.message || 'An error occurred while submitting verification data')
        }
        console.error('Verification submission error:', error)
    }
}
</script>

<template>
    <div class="verification-form-wrapper">
        <div class="verification-form-card">
            <h2>Complete Your Profile</h2>
            <p class="form-description">
                Please provide the following information to complete your registration.
                This helps us verify your identity and ensure account security.
            </p>
            
            <form @submit.prevent="handleSubmit">
            <!-- Phone Number -->
            <div class="verification-form-group">
                <label for="phone" class="verification-label">
                    Phone Number <span class="required">*</span>
                </label>
                <div class="verification-input-wrapper">
                    <input 
                        id="phone"
                        v-model="phoneNumber"
                        type="tel"
                        placeholder="555-123-4567"
                        class="form-input"
                        :class="{ 'input-error': fieldErrors.phone_number }"
                    >
                    <span v-if="fieldErrors.phone_number" class="error-text">
                        {{ fieldErrors.phone_number }}
                    </span>
                </div>
            </div>
            
            <!-- Address Line 1 -->
            <div class="verification-form-group">
                <label for="address1" class="verification-label">
                    Address Line 1 <span class="required">*</span>
                </label>
                <div class="verification-input-wrapper">
                    <input 
                        id="address1"
                        v-model="addressLine1"
                        type="text"
                        placeholder="123 Main Street"
                        class="form-input"
                        :class="{ 'input-error': fieldErrors.address_line_1 }"
                    >
                    <span v-if="fieldErrors.address_line_1" class="error-text">
                        {{ fieldErrors.address_line_1 }}
                    </span>
                </div>
            </div>
            
            <!-- Address Line 2 -->
            <div class="verification-form-group">
                <label for="address2" class="verification-label">
                    Address Line 2 <span class="optional">(optional)</span>
                </label>
                <div class="verification-input-wrapper">
                    <input 
                        id="address2"
                        v-model="addressLine2"
                        type="text"
                        placeholder="Apt 4B, Suite 100, etc."
                        class="form-input"
                    >
                </div>
            </div>
            
            <!-- City, State, ZIP Row -->
            <div class="form-row">
                <div class="verification-form-group">
                    <label for="city" class="verification-label">
                        City <span class="required">*</span>
                    </label>
                    <input 
                        id="city"
                        v-model="city"
                        type="text"
                        placeholder="Seattle"
                        class="form-input"
                        :class="{ 'input-error': fieldErrors.city }"
                    >
                    <span v-if="fieldErrors.city" class="error-text">
                        {{ fieldErrors.city }}
                    </span>
                </div>
                
                <div class="verification-form-group">
                    <label for="state" class="verification-label">
                        State <span class="required">*</span>
                    </label>
                    <select 
                        id="state"
                        v-model="state"
                        class="form-input"
                        :class="{ 'input-error': fieldErrors.state }"
                    >
                        <option value="">Select...</option>
                        <option v-for="st in US_STATES" :key="st" :value="st">
                            {{ st }}
                        </option>
                    </select>
                    <span v-if="fieldErrors.state" class="error-text">
                        {{ fieldErrors.state }}
                    </span>
                </div>
                
                <div class="verification-form-group">
                    <label for="zip" class="verification-label">
                        ZIP Code <span class="required">*</span>
                    </label>
                    <input 
                        id="zip"
                        v-model="zip"
                        type="text"
                        placeholder="98101"
                        class="form-input"
                        maxlength="10"
                        :class="{ 'input-error': fieldErrors.zip }"
                    >
                    <span v-if="fieldErrors.zip" class="error-text">
                        {{ fieldErrors.zip }}
                    </span>
                </div>
            </div>
            
            <!-- Is Minor Checkbox -->
            <div class="verification-form-group checkbox-group">
                <label class="checkbox-label">
                    <input 
                        v-model="isMinor"
                        type="checkbox"
                        class="form-checkbox"
                    >
                    <span>I am under 18 years old</span>
                </label>
            </div>
            
            <!-- Parent Approval (only if minor) -->
            <div v-if="showParentApproval" class="verification-form-group parent-approval-section">
                <label class="checkbox-label">
                    <input 
                        v-model="parentApproval"
                        type="checkbox"
                        class="form-checkbox"
                        :class="{ 'input-error': fieldErrors.parent_approval }"
                    >
                    <span>
                        My parent or legal guardian has approved my registration
                        <span class="required">*</span>
                    </span>
                </label>
                <span v-if="fieldErrors.parent_approval" class="error-text parent-approval-error">
                    {{ fieldErrors.parent_approval }}
                </span>
            </div>
            
            <!-- Submit Button -->
            <button 
                type="submit" 
                class="form-button form-button-full"
                :disabled="isUpdating"
            >
                {{ isUpdating ? 'Submitting...' : 'Submit Verification' }}
            </button>
        </form>
        </div>
    </div>
</template>

<style scoped>
.verification-form-wrapper {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
}

.verification-form-card {
    background: white;
    border-radius: var(--border-radius);
    padding: var(--spacing-xl);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.verification-form-card h2 {
    margin-top: 0;
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
}

.form-description {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xl);
    line-height: 1.6;
}

/* Override global form-group for verification form - use vertical stacking */
.verification-form-group {
    margin-bottom: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.verification-label {
    color: var(--text-primary);
    font-weight: 500;
    font-size: 0.95rem;
}

.verification-input-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

/* Form row for city/state/zip */
.form-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1.5fr;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
}

.form-row .verification-form-group {
    margin-bottom: 0;
}

.required {
    color: var(--error-color);
}

.optional {
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: normal;
}

.input-error {
    border-color: var(--error-color) !important;
}

.error-text {
    display: block;
    color: var(--error-color);
    font-size: 0.875rem;
}

/* Checkbox styling */
.checkbox-group {
    margin-bottom: var(--spacing-md);
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
    font-size: 0.95rem;
}

.form-checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.parent-approval-section {
    background-color: var(--background-secondary, #f8f9fa);
    padding: var(--spacing-md);
    border-radius: var(--border-radius);
    border-left: 3px solid var(--primary-color);
    margin-bottom: var(--spacing-lg);
}

.parent-approval-section .checkbox-label {
    margin-bottom: 0;
}

.parent-approval-error {
    margin-top: var(--spacing-xs);
    margin-left: calc(18px + var(--spacing-sm));
}

/* Mobile responsive */
@media (max-width: 768px) {
    .verification-form-card {
        padding: var(--spacing-lg);
    }
    
    .form-row {
        grid-template-columns: 1fr;
    }
}
</style>

