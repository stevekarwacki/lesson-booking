<template>
    <div class="profile">
        <Card>
            <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                    Manage your personal information and account settings.
                </CardDescription>
            </CardHeader>
            
            <CardContent>
                <form @submit.prevent="updateProfile" class="profile-form">
                    <!-- Basic Information Section -->
                    <div class="subsection">
                        <h3 class="subsection-header">Basic Information</h3>
                        
                        <div class="form-group form-group-horizontal">
                            <Label for="name" class="form-label">
                                Name <span class="required">*</span>
                            </Label>
                            <div class="form-input-wrapper">
                                <Input 
                                    id="name"
                                    v-model="profileData.name"
                                    type="text"
                                    required
                                />
                            </div>
                        </div>

                        <div class="form-group form-group-horizontal">
                            <Label for="email" class="form-label">
                                Email <span class="required">*</span>
                            </Label>
                            <div class="form-input-wrapper">
                                <Input 
                                    id="email"
                                    v-model="profileData.email"
                                    type="email"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div class="section-divider"></div>

                    <!-- Contact Information Section -->
                    <div class="subsection">
                        <h3 class="subsection-header">Contact Information</h3>
                        
                        <div class="form-group form-group-horizontal">
                            <Label for="phone" class="form-label">
                                Phone Number <span class="required">*</span>
                            </Label>
                            <div class="form-input-wrapper">
                                <Input 
                                    id="phone"
                                    v-model="profileData.phoneNumber"
                                    type="tel"
                                    placeholder="555-123-4567"
                                    required
                                />
                                <p v-if="fieldErrors.phone_number" class="error-message">
                                    {{ fieldErrors.phone_number }}
                                </p>
                            </div>
                        </div>

                        <div class="form-group form-group-horizontal">
                            <Label for="address1" class="form-label">
                                Address Line 1 <span class="required">*</span>
                            </Label>
                            <div class="form-input-wrapper">
                                <Input 
                                    id="address1"
                                    v-model="profileData.addressLine1"
                                    type="text"
                                    placeholder="123 Main Street"
                                    required
                                />
                                <p v-if="fieldErrors.address_line_1" class="error-message">
                                    {{ fieldErrors.address_line_1 }}
                                </p>
                            </div>
                        </div>

                        <div class="form-group form-group-horizontal">
                            <Label for="address2" class="form-label">
                                Address Line 2 <span class="optional">(optional)</span>
                            </Label>
                            <div class="form-input-wrapper">
                                <Input 
                                    id="address2"
                                    v-model="profileData.addressLine2"
                                    type="text"
                                    placeholder="Apt 4B, Suite 100, etc."
                                />
                            </div>
                        </div>

                        <div class="form-group form-group-horizontal">
                            <Label class="form-label">
                                City, State & ZIP <span class="required">*</span>
                            </Label>
                            <div class="address-fields">
                                <div class="address-field">
                                    <Input 
                                        id="city"
                                        v-model="profileData.city"
                                        type="text"
                                        placeholder="City"
                                        required
                                    />
                                    <p v-if="fieldErrors.city" class="error-message">
                                        {{ fieldErrors.city }}
                                    </p>
                                </div>

                                <div class="address-field">
                                    <Select v-model="profileData.state" required>
                                        <SelectTrigger id="state">
                                            <SelectValue placeholder="State" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem v-for="st in US_STATES" :key="st" :value="st">
                                                {{ st }}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p v-if="fieldErrors.state" class="error-message">
                                        {{ fieldErrors.state }}
                                    </p>
                                </div>

                                <div class="address-field address-field-zip">
                                    <Input 
                                        id="zip"
                                        v-model="profileData.zip"
                                        type="text"
                                        placeholder="ZIP"
                                        maxlength="10"
                                        required
                                    />
                                    <p v-if="fieldErrors.zip" class="error-message">
                                        {{ fieldErrors.zip }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="section-divider"></div>

                    <!-- Additional Information Section -->
                    <div class="subsection">
                        <h3 class="subsection-header">Additional Information</h3>
                        
                        <div class="checkbox-group">
                            <label class="checkbox-label">
                                <input 
                                    v-model="profileData.isMinor"
                                    type="checkbox"
                                    class="checkbox-input"
                                >
                                <span>Student is under 18 years of age</span>
                            </label>
                        </div>

                        <div v-if="profileData.isMinor" class="parent-approval-group">
                            <label class="checkbox-label parent-approval-label">
                                <input 
                                    v-model="profileData.parentApproval"
                                    type="checkbox"
                                    class="checkbox-input"
                                >
                                <span>
                                    I am a parent/guardian and approve this student's registration
                                    <span class="required">*</span>
                                </span>
                            </label>
                        </div>
                    </div>

                    <!-- Form Actions -->
                    <div class="button-group">
                        <Button type="submit" :disabled="loading">
                            {{ loading ? 'Saving...' : 'Save Profile' }}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useFormFeedback } from '../composables/useFormFeedback'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const userStore = useUserStore()
const formFeedback = useFormFeedback()

const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

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
    parentApproval: false
})

const loading = ref(false)
const fieldErrors = ref({})

const isProfileIncomplete = computed(() => {
    return !userStore.user?.profile_completed_at
})

const loadProfile = () => {
    if (userStore.user) {
        profileData.value = {
            name: userStore.user.name || '',
            email: userStore.user.email || '',
            phoneNumber: userStore.user.phone_number || '',
            addressLine1: userStore.user.user_profile_data?.address?.line_1 || '',
            addressLine2: userStore.user.user_profile_data?.address?.line_2 || '',
            city: userStore.user.user_profile_data?.address?.city || '',
            state: userStore.user.user_profile_data?.address?.state || '',
            zip: userStore.user.user_profile_data?.address?.zip || '',
            isMinor: userStore.user.is_student_minor || false,
            parentApproval: userStore.user.user_profile_data?.parent_approval || false
        }
    }
}

const updateProfile = async () => {
    loading.value = true
    fieldErrors.value = {}

    try {
        const response = await fetch('/api/users/me/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify({
                name: profileData.value.name,
                email: profileData.value.email,
                phone_number: profileData.value.phoneNumber,
                is_student_minor: profileData.value.isMinor,
                parent_approval: profileData.value.parentApproval,
                address: {
                    line_1: profileData.value.addressLine1,
                    line_2: profileData.value.addressLine2 || null,
                    city: profileData.value.city,
                    state: profileData.value.state,
                    zip: profileData.value.zip
                }
            })
        })

        const data = await response.json()

        if (!response.ok) {
            if (data.fieldErrors) {
                fieldErrors.value = data.fieldErrors
                formFeedback.showError('Please correct the errors below')
            } else {
                formFeedback.showError(data.error || 'Failed to update profile')
            }
            return
        }

        // Update user store with new data
        await userStore.fetchUser()
        
        formFeedback.showSuccess('Profile updated successfully')
    } catch (err) {
        formFeedback.showError('An error occurred while updating your profile')
        console.error('Profile update error:', err)
    } finally {
        loading.value = false
    }
}

// Watch for minor checkbox changes
watch(() => profileData.value.isMinor, (newVal) => {
    if (!newVal) {
        profileData.value.parentApproval = false
    }
})

onMounted(() => {
    loadProfile()
})
</script>

<style scoped>
.profile {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.profile-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.optional {
    font-weight: normal;
    color: var(--text-secondary, #6b7280);
}

.address-fields {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 0.75rem;
  max-width: 600px;
}

.address-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.address-field-zip {
    max-width: 120px;
}

.checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    cursor: pointer;
    line-height: 1.5;
}

.checkbox-input {
    margin-top: 0.25rem;
    width: 1rem;
    height: 1rem;
    cursor: pointer;
}

.parent-approval-group {
    margin-top: 0.5rem;
    padding: 1rem;
    background: var(--background-secondary, #f9fafb);
    border-left: 3px solid var(--primary-color, #3b82f6);
    border-radius: 4px;
}

.parent-approval-label {
    font-weight: 500;
}

@media (max-width: 768px) {
    .address-fields {
        grid-template-columns: 1fr;
    }
    
    .address-field-zip {
        max-width: 100%;
    }
}
</style>
