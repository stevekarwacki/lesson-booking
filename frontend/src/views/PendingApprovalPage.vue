<script setup>
import { ref, onMounted } from 'vue'
import VerificationForm from '../components/VerificationForm.vue'
import { useUserStore } from '../stores/userStore'

const userStore = useUserStore()

const businessInfo = ref(null)
const showVerificationForm = ref(false)
const isLoading = ref(true)

// Fetch business contact information
const fetchBusinessInfo = async () => {
    try {
        const response = await fetch('/api/public/business-info')
        if (response.ok) {
            businessInfo.value = await response.json()
        }
    } catch (error) {
        console.error('Error fetching business info:', error)
    }
}

// Determine what to show based on verification status
const checkVerificationStatus = () => {
    const status = userStore.user?.verification_status
    
    if (!status) {
        // No verification status available yet
        isLoading.value = true
        return
    }
    
    // If verification is not complete, show the form
    if (status.needsVerification) {
        showVerificationForm.value = true
    }
    
    isLoading.value = false
}

// Handle successful verification submission
const handleVerificationComplete = () => {
    showVerificationForm.value = false
    // The user store will be updated by the VerificationForm component
}

onMounted(async () => {
    await fetchBusinessInfo()
    checkVerificationStatus()
})
</script>

<template>
    <div class="pending-approval-page">
        <div v-if="isLoading" class="loading-container">
            <p>Loading...</p>
        </div>
        
        <!-- Show Verification Form if profile is incomplete -->
        <div v-else-if="showVerificationForm" class="verification-container">
            <VerificationForm @verification-complete="handleVerificationComplete" />
        </div>
        
        <!-- Show Pending Approval Message if profile is complete but not approved -->
        <div v-else class="approval-pending-container">
            <div class="approval-card">
                <div class="icon-container">
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="64" 
                        height="64" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        stroke-width="2" 
                        stroke-linecap="round" 
                        stroke-linejoin="round"
                        class="pending-icon"
                    >
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                </div>
                
                <h1>Account Pending Approval</h1>
                
                <p class="main-message">
                    Thank you for completing your profile! Your account is currently under review.
                </p>
                
                <div class="info-box">
                    <h3>What happens next?</h3>
                    <p>
                        Our team is reviewing your registration. You will receive an email notification
                        once your account has been approved and you can start booking lessons.
                    </p>
                </div>
                
                <div v-if="businessInfo" class="contact-info">
                    <h3>Need Help?</h3>
                    <p>If you have any questions or need assistance, please contact us:</p>
                    
                    <div class="contact-details">
                        <div v-if="businessInfo.contactEmail" class="contact-item">
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="20" 
                                height="20" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                stroke-width="2"
                            >
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            <a :href="`mailto:${businessInfo.contactEmail}`">
                                {{ businessInfo.contactEmail }}
                            </a>
                        </div>
                        
                        <div v-if="businessInfo.phoneNumber" class="contact-item">
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="20" 
                                height="20" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                stroke-width="2"
                            >
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            <a :href="`tel:${businessInfo.phoneNumber}`">
                                {{ businessInfo.phoneNumber }}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pending-approval-page {
    min-height: calc(100vh - 200px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: var(--spacing-xl) var(--spacing-lg);
    padding-top: calc(var(--spacing-xl) * 2);
}

.loading-container {
    text-align: center;
}

.verification-container {
    width: 100%;
    max-width: 800px;
}

.approval-pending-container {
    width: 100%;
    max-width: 600px;
}

.approval-card {
    background: white;
    border-radius: var(--border-radius);
    padding: var(--spacing-xl);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    text-align: center;
}

.icon-container {
    margin-bottom: var(--spacing-lg);
}

.pending-icon {
    color: var(--warning-color, #f39c12);
    margin: 0 auto;
}

.approval-card h1 {
    color: var(--text-primary);
    margin-bottom: var(--spacing-md);
    font-size: 1.75rem;
}

.main-message {
    color: var(--text-secondary);
    font-size: 1.125rem;
    margin-bottom: var(--spacing-xl);
    line-height: 1.6;
}

.info-box {
    background: var(--background-secondary, #f8f9fa);
    border-radius: var(--border-radius);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
    text-align: left;
}

.info-box h3 {
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
    font-size: 1.125rem;
}

.info-box p {
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
}

.contact-info {
    border-top: 1px solid var(--border-color, #dee2e6);
    padding-top: var(--spacing-lg);
    text-align: left;
}

.contact-info h3 {
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
    font-size: 1.125rem;
}

.contact-info > p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-md);
}

.contact-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.contact-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--text-secondary);
}

.contact-item svg {
    flex-shrink: 0;
    color: var(--primary-color);
}

.contact-item a {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: 500;
}

.contact-item a:hover {
    text-decoration: underline;
}

/* Mobile responsive */
@media (max-width: 768px) {
    .pending-approval-page {
        padding: var(--spacing-lg) var(--spacing-md);
    }
    
    .approval-card {
        padding: var(--spacing-lg);
    }
    
    .approval-card h1 {
        font-size: 1.5rem;
    }
}
</style>

