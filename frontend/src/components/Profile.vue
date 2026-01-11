<template>
    <div class="profile">
        <div v-if="isProfileIncomplete" class="profile-header-incomplete">
            <h2>Complete Your Profile</h2>
            <p class="profile-description">
                Please provide the following information to complete your registration.
                This helps us verify your identity and ensure account security.
            </p>
        </div>
        <h2 v-else>Profile</h2>
        
        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>

        <div class="card">
            <form @submit.prevent="updateProfile">
                <!-- Basic Information Section -->
                <div class="form-section">
                    <h3 class="section-heading">Basic Information</h3>
                    
                    <div class="form-group">
                        <label for="name">Name <span class="required">*</span></label>
                        <input 
                            id="name"
                            v-model="profileData.name"
                            type="text"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="email">Email <span class="required">*</span></label>
                        <input 
                            id="email"
                            v-model="profileData.email"
                            type="email"
                            required
                        >
                    </div>
                </div>

                <!-- Contact Information Section -->
                <div class="form-section">
                    <h3 class="section-heading">Contact Information</h3>
                    
                    <div class="form-group">
                        <label for="phone">Phone Number <span class="required">*</span></label>
                        <input 
                            id="phone"
                            v-model="profileData.phoneNumber"
                            type="tel"
                            placeholder="555-123-4567"
                            required
                        >
                        <span v-if="fieldErrors.phone_number" class="field-error">
                            {{ fieldErrors.phone_number }}
                        </span>
                    </div>

                    <div class="form-group">
                        <label for="address1">Address Line 1 <span class="required">*</span></label>
                        <input 
                            id="address1"
                            v-model="profileData.addressLine1"
                            type="text"
                            placeholder="123 Main Street"
                            required
                        >
                        <span v-if="fieldErrors.address_line_1" class="field-error">
                            {{ fieldErrors.address_line_1 }}
                        </span>
                    </div>

                    <div class="form-group">
                        <label for="address2">Address Line 2 <span class="optional">(optional)</span></label>
                        <input 
                            id="address2"
                            v-model="profileData.addressLine2"
                            type="text"
                            placeholder="Apt 4B, Suite 100, etc."
                        >
                    </div>

                    <div class="form-row-address">
                        <div class="address-field">
                            <label for="city">City <span class="required">*</span></label>
                            <input 
                                id="city"
                                v-model="profileData.city"
                                type="text"
                                placeholder="Seattle"
                                required
                            >
                            <span v-if="fieldErrors.city" class="field-error">
                                {{ fieldErrors.city }}
                            </span>
                        </div>

                        <div class="address-field">
                            <label for="state">State <span class="required">*</span></label>
                            <select 
                                id="state"
                                v-model="profileData.state"
                                required
                            >
                                <option value="">Select...</option>
                                <option v-for="st in US_STATES" :key="st" :value="st">
                                    {{ st }}
                                </option>
                            </select>
                            <span v-if="fieldErrors.state" class="field-error">
                                {{ fieldErrors.state }}
                            </span>
                        </div>

                        <div class="address-field">
                            <label for="zip">ZIP Code <span class="required">*</span></label>
                            <input 
                                id="zip"
                                v-model="profileData.zip"
                                type="text"
                                placeholder="98101"
                                maxlength="10"
                                required
                            >
                            <span v-if="fieldErrors.zip" class="field-error">
                                {{ fieldErrors.zip }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Additional Information Section -->
                <div class="form-section">
                    <h3 class="section-heading">Additional Information</h3>
                    
                    <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                            <input 
                                v-model="profileData.isMinor"
                                type="checkbox"
                            >
                            <span>I am under 18 years old</span>
                        </label>
                    </div>

                    <div v-if="profileData.isMinor" class="form-group parent-approval-group">
                        <label class="checkbox-label parent-approval-label">
                            <input 
                                v-model="profileData.parentApproval"
                                type="checkbox"
                            >
                            <span>
                                My parent or legal guardian has approved my registration
                                <span class="required">*</span>
                            </span>
                        </label>
                        <span v-if="fieldErrors.parent_approval" class="field-error">
                            {{ fieldErrors.parent_approval }}
                        </span>
                    </div>
                </div>

                <!-- Password Section -->
                <div class="form-section">
                    <h3 class="section-heading">Change Password</h3>
                    
                    <div class="form-group">
                        <label for="new-password">New Password <span class="optional">(leave blank to keep current)</span></label>
                        <input 
                            id="new-password"
                            ref="newPasswordInput"
                            v-model="profileData.newPassword"
                            type="password"
                            placeholder="Enter new password"
                            autocomplete="new-password"
                            @input="validatePasswordStrengthOnInput"
                        >
                    </div>

                    <div class="form-group">
                        <label for="confirm-password">Confirm New Password</label>
                        <input 
                            id="confirm-password"
                            ref="confirmPasswordInput"
                            v-model="profileData.confirmPassword"
                            type="password"
                            placeholder="Confirm new password"
                            autocomplete="new-password"
                            :disabled="!profileData.newPassword"
                            :required="!!profileData.newPassword"
                            @input="validatePasswordMatch"
                        >
                    </div>
                </div>

                <button type="submit" class="btn btn-primary">Update Profile</button>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { validateProfileData, validatePasswordsMatch, validatePasswordStrength } from '../utils/formValidation'
import { useProfileUpdate } from '../composables/useProfileUpdate'

const userStore = useUserStore()
const { updateProfileAsync } = useProfileUpdate()

const error = ref('')
const success = ref('')
const fieldErrors = ref({})
const newPasswordInput = ref(null)
const confirmPasswordInput = ref(null)

const profileData = ref({
    name: '',
    email: '',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: '',
    isMinor: false,
    parentApproval: false,
    newPassword: '',
    confirmPassword: ''
})

// US States for dropdown
const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

// Check if profile is incomplete
const isProfileIncomplete = computed(() => {
    const user = userStore.user
    if (!user) return false
    
    // Check if essential verification fields are missing
    const hasPhone = !!user.phone_number
    const hasAddress = user.user_profile_data?.address?.line_1 && 
                       user.user_profile_data?.address?.city && 
                       user.user_profile_data?.address?.state && 
                       user.user_profile_data?.address?.zip
    
    return !hasPhone || !hasAddress
})

onMounted(async () => {
    if (userStore.user) {
        // Load basic info
        profileData.value.name = userStore.user.name || ''
        profileData.value.email = userStore.user.email || ''
        
        // Load verification/extended profile info
        profileData.value.phoneNumber = userStore.user.phone_number || ''
        profileData.value.isMinor = userStore.user.is_student_minor || false
        
        // Load address from JSON field
        const address = userStore.user.user_profile_data?.address
        if (address) {
            profileData.value.addressLine1 = address.line_1 || ''
            profileData.value.addressLine2 = address.line_2 || ''
            profileData.value.city = address.city || ''
            profileData.value.state = address.state || ''
            profileData.value.zip = address.zip || ''
        }
        
        // Load parent approval if minor
        if (userStore.user.is_student_minor) {
            profileData.value.parentApproval = userStore.user.user_profile_data?.parent_approval || false
        }
        
        // DO NOT pre-populate password fields - always leave blank
        profileData.value.newPassword = ''
        profileData.value.confirmPassword = ''
    }
})

// Validate password strength as user types
const validatePasswordStrengthOnInput = () => {
    if (!newPasswordInput.value) return
    
    // If password is empty, clear any validation errors
    if (!profileData.value.newPassword) {
        newPasswordInput.value.setCustomValidity('')
        // Also trigger password match validation
        validatePasswordMatch()
        return
    }
    
    // Use pure helper to validate strength
    const strengthValidation = validatePasswordStrength(
        profileData.value.newPassword
    )
    
    // Apply result to browser's validation API
    if (strengthValidation.valid) {
        newPasswordInput.value.setCustomValidity('')
    } else {
        newPasswordInput.value.setCustomValidity(strengthValidation.errors[0])
    }
    
    // Also trigger password match validation
    validatePasswordMatch()
}

// Use browser's built-in validation for password matching
// This adapter bridges the pure validation logic with the browser's validation API
const validatePasswordMatch = () => {
    if (!confirmPasswordInput.value) return
    
    // Use pure helper to validate
    const validation = validatePasswordsMatch(
        profileData.value.newPassword,
        profileData.value.confirmPassword
    )
    
    // Apply result to browser's validation API
    if (validation.valid) {
        confirmPasswordInput.value.setCustomValidity('')
    } else {
        confirmPasswordInput.value.setCustomValidity(validation.error)
    }
}

const updateProfile = async () => {
    error.value = ''
    success.value = ''
    fieldErrors.value = {}

    // Browser validation handles password strength and matching, but double-check
    if (profileData.value.newPassword && !profileData.value.confirmPassword) {
        error.value = 'Please confirm your new password'
        return
    }

    if (profileData.value.newPassword) {
        const strengthValidation = validatePasswordStrength(
            profileData.value.newPassword,
            { minLength: 8 }
        )
        
        if (!strengthValidation.valid) {
            error.value = strengthValidation.errors.join(', ')
            return
        }
    }

    const passwordValidation = validatePasswordsMatch(
        profileData.value.newPassword,
        profileData.value.confirmPassword
    )
    
    if (!passwordValidation.valid) {
        error.value = passwordValidation.error
        return
    }

    // Validate profile fields
    const profileValidation = validateProfileData({
        phone_number: profileData.value.phoneNumber,
        address_line_1: profileData.value.addressLine1,
        city: profileData.value.city,
        state: profileData.value.state,
        zip: profileData.value.zip,
        is_minor: profileData.value.isMinor,
        parent_approval: profileData.value.parentApproval
    })
    
    if (!profileValidation.valid) {
        fieldErrors.value = profileValidation.errors
        error.value = 'Please fix the errors below'
        return
    }

    try {
        // Prepare the update payload
        const updatePayload = {
            name: profileData.value.name,
            email: profileData.value.email
        }
        
        // Add password if provided (and confirmed)
        if (profileData.value.newPassword && profileData.value.confirmPassword) {
            updatePayload.password = profileData.value.newPassword
        }

        // Update basic profile info (name, email, password)
        const profileResponse = await fetch(`/api/users/${userStore.user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify(updatePayload)
        })

        if (!profileResponse.ok) {
            const data = await profileResponse.json()
            throw new Error(data.error || 'Failed to update profile')
        }

        // Update verification data (phone, address, minor status)
        const profileUpdateData = {
            phone_number: profileData.value.phoneNumber.trim(),
            is_student_minor: profileData.value.isMinor,
            address: {
                line_1: profileData.value.addressLine1.trim(),
                line_2: profileData.value.addressLine2.trim() || null,
                city: profileData.value.city.trim(),
                state: profileData.value.state,
                zip: profileData.value.zip.trim()
            }
        }
        
        // Add parent approval if minor
        if (profileData.value.isMinor) {
            profileUpdateData.parent_approval = profileData.value.parentApproval
        }
        
        await updateProfileAsync(profileUpdateData)

        success.value = 'Profile updated successfully'
        
        // Clear password fields after successful update
        profileData.value.newPassword = ''
        profileData.value.confirmPassword = ''
        
        // Clear any custom validity messages
        if (newPasswordInput.value) {
            newPasswordInput.value.setCustomValidity('')
        }
        if (confirmPasswordInput.value) {
            confirmPasswordInput.value.setCustomValidity('')
        }
        
        // Refresh user data
        await userStore.fetchUser()
        
    } catch (err) {
        error.value = err.message || 'An error occurred while updating your profile'
        console.error('Profile update error:', err)
    }
}
</script>

<style scoped>
.profile {
    max-width: 800px;
    margin: 0 auto;
}

.profile-header-incomplete {
    margin-bottom: var(--spacing-lg);
}

.profile-header-incomplete h2 {
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
}

.profile-description {
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 0;
}

h2 {
    margin-bottom: var(--spacing-md);
    color: var(--secondary-color);
}

.form-section {
    margin-bottom: var(--spacing-xl);
    padding-bottom: var(--spacing-xl);
    border-bottom: 1px solid var(--border-color, #dee2e6);
}

.form-section:last-of-type {
    border-bottom: none;
    margin-bottom: var(--spacing-lg);
}

.section-heading {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-top: 0;
    margin-bottom: var(--spacing-md);
}

.form-row-address {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
}

/* Address fields use horizontal grid layout like standard form-group */
.address-field {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--spacing-sm);
    align-items: center;
}

.address-field label {
    color: var(--text-primary);
    font-weight: 500;
    white-space: nowrap;
}

.address-field .field-error {
    grid-column: 1 / -1;
}

.required {
    color: var(--error-color);
}

.optional {
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: normal;
}

.field-error {
    display: block;
    color: var(--error-color);
    font-size: 0.875rem;
    margin-top: var(--spacing-xs);
}

.checkbox-group {
    margin-bottom: var(--spacing-md);
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.parent-approval-group {
    background-color: var(--background-secondary, #f8f9fa);
    padding: var(--spacing-md);
    border-radius: var(--border-radius);
    border-left: 3px solid var(--primary-color);
    margin-bottom: var(--spacing-md);
}

.parent-approval-label {
    margin-bottom: 0;
}

/* Mobile responsive */
@media (max-width: 768px) {
    .form-row-address {
        grid-template-columns: 1fr;
    }
    
    .field-error {
        grid-column: 1;
    }
}
</style> 