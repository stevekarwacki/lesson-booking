<script setup>
import { computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useRouter } from 'vue-router'
import { useBranding } from '../composables/useBranding'
import { formatPhoneNumber } from '../utils/formValidation'

const userStore = useUserStore()
const router = useRouter()
const { businessInfo } = useBranding()

const verificationStatus = computed(() => userStore.user?.verification_status)

const showBanner = computed(() => {
    if (!verificationStatus.value) return false
    return verificationStatus.value.needsVerification || verificationStatus.value.needsApproval
})

const bannerType = computed(() => {
    if (verificationStatus.value?.needsVerification) return 'warning'
    if (verificationStatus.value?.needsApproval) return 'info'
    return 'info'
})

const bannerMessage = computed(() => {
    if (verificationStatus.value?.needsVerification) {
        return {
            title: 'Complete Your Profile',
            message: 'Please complete your profile information to access all features.',
            action: 'Complete Profile',
            actionRoute: '/account'
        }
    }
    if (verificationStatus.value?.needsApproval) {
        const formattedPhone = formatPhoneNumber(businessInfo.value?.phoneNumber)
        const phoneText = formattedPhone 
            ? ` Please call ${formattedPhone} to complete verification.` 
            : ' Please contact us to complete verification.'
        
        return {
            title: 'Account Pending Approval',
            message: `Your profile is complete and awaiting admin approval.${phoneText}`,
            action: null,
            actionRoute: null
        }
    }
    return null
})

const handleAction = () => {
    if (bannerMessage.value?.actionRoute) {
        router.push(bannerMessage.value.actionRoute)
    }
}

const isDismissed = computed(() => {
    // Future: Track if user has dismissed the banner in this session
    return false
})

// Business info is automatically loaded via useBranding composable
</script>

<template>
    <div v-if="showBanner && !isDismissed" class="profile-status-banner" :class="`banner-${bannerType}`">
        <div class="banner-content">
            <div class="banner-icon">
                <!-- Warning icon for incomplete profile -->
                <svg 
                    v-if="bannerType === 'warning'"
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    stroke-width="2"
                    stroke-linecap="round" 
                    stroke-linejoin="round"
                >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                
                <!-- Info icon for pending approval -->
                <svg 
                    v-else
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    stroke-width="2"
                    stroke-linecap="round" 
                    stroke-linejoin="round"
                >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
            </div>
            
            <div class="banner-text">
                <strong class="banner-title">{{ bannerMessage?.title }}</strong>
                <span class="banner-message">{{ bannerMessage?.message }}</span>
            </div>
            
            <button 
                v-if="bannerMessage?.action"
                class="banner-action"
                @click="handleAction"
            >
                {{ bannerMessage.action }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.profile-status-banner {
    padding: var(--spacing-md) var(--spacing-lg);
    margin: 0;
    border-radius: 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.banner-warning {
    background-color: #fff3cd;
    border: none;
    border-bottom: 2px solid #ffc107;
    color: #856404;
}

.banner-info {
    background-color: #d1ecf1;
    border: none;
    border-bottom: 2px solid #17a2b8;
    color: #0c5460;
}

.banner-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    max-width: 1200px;
    margin: 0 auto;
}

.banner-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
}

.banner-icon svg {
    width: 24px;
    height: 24px;
}

.banner-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.banner-title {
    font-weight: 600;
    font-size: 1rem;
}

.banner-message {
    font-size: 0.9rem;
    opacity: 0.9;
}

.banner-action {
    flex-shrink: 0;
    padding: var(--spacing-sm) var(--spacing-md);
    background: white;
    border: 1px solid currentColor;
    border-radius: var(--border-radius);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.banner-warning .banner-action {
    color: #856404;
}

.banner-warning .banner-action:hover {
    background: #ffc107;
    color: white;
    border-color: #ffc107;
}

.banner-info .banner-action {
    color: #0c5460;
}

.banner-info .banner-action:hover {
    background: #17a2b8;
    color: white;
    border-color: #17a2b8;
}

/* Mobile responsive */
@media (max-width: 768px) {
    .profile-status-banner {
        padding: var(--spacing-sm) var(--spacing-md);
    }
    
    .banner-content {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
    }
    
    .banner-text {
        gap: var(--spacing-xs);
    }
    
    .banner-action {
        align-self: stretch;
        text-align: center;
    }
}
</style>

