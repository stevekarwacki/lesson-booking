<template>
    <div class="google-auth-callback">
        <div class="callback-container">
            <div v-if="isProcessing" class="processing">
                <div class="spinner"></div>
                <h2>Processing Google Calendar Authorization...</h2>
                <p>Please wait while we connect your Google Calendar.</p>
            </div>
            
            <div v-else-if="success" class="success">
                <div class="success-icon">✅</div>
                <h2>Google Calendar Connected Successfully!</h2>
                <p>You can now close this window and return to your availability settings.</p>
                <Button @click="closeWindow">Close Window</Button>
            </div>
            
            <div v-else-if="error" class="error">
                <div class="error-icon">❌</div>
                <h2>Connection Failed</h2>
                <p>{{ error }}</p>
                <p class="help-text">
                    Please close this window and try connecting again from your availability settings.
                </p>
                <Button @click="closeWindow" variant="outline">Close Window</Button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import axios from 'axios'
import { OAUTH_ERRORS, OAUTH_MESSAGE_TYPES } from '../constants/oauthConstants'
import { extractErrorMessage } from '../utils/errorHelpers'
import { Button } from '@/components/ui/button'

const route = useRoute()
const userStore = useUserStore()

const isProcessing = ref(true)
const success = ref(false)
const error = ref('')

const closeWindow = () => {
    if (window.opener) {
        window.close()
    } else {
        // If not opened as a popup, redirect to availability page
        window.location.href = '/availability'
    }
}

const processAuthCallback = async () => {
    try {
        // Get the authorization code from URL parameters
        const code = route.query.code
        const state = route.query.state
        const errorParam = route.query.error
        
        // Check for OAuth errors
        if (errorParam) {
            throw new Error(`Google OAuth error: ${errorParam}`)
        }
        
        if (!code) {
            throw new Error('No authorization code received from Google')
        }
        
        // Extract instructor ID from state parameter if provided
        // The state parameter should contain the instructor ID
        let instructorId = null
        if (state) {
            try {
                const stateData = JSON.parse(atob(state))
                instructorId = stateData.instructorId
            } catch (e) {
                // Could not parse state parameter
            }
        }
        
        // If no instructor ID in state, try to get it from the current user
        if (!instructorId && userStore.user) {
            if (userStore.canManageCalendar && !userStore.canManageUsers) {
                // For instructors, we need to get their instructor ID
                const instructorResponse = await axios.get('/api/instructors/me')
                instructorId = instructorResponse.data.id
            } else if (userStore.canManageUsers) {
                // For admins, we'd need them to specify which instructor
                // For now, we'll show an error
                throw new Error('Admin users must specify which instructor to connect')
            }
        }
        
        if (!instructorId) {
            throw new Error('Could not determine instructor ID for Google Calendar connection')
        }
        
        // Send the authorization code to our backend
        const response = await axios.post('/api/auth/google/callback', {
            code: code,
            instructorId: instructorId
        })
        
        if (response.data.success) {
            success.value = true
            
            // Notify parent window of success
            if (window.opener) {
                window.opener.postMessage({
                    type: OAUTH_MESSAGE_TYPES.SUCCESS,
                    message: 'Google account connected successfully'
                }, window.location.origin)
            }
            
            // Auto-close the window after a short delay
            setTimeout(() => {
                closeWindow()
            }, 3000)
        } else {
            throw new Error(response.data.message || OAUTH_ERRORS.CALLBACK_FAILED)
        }
        
    } catch (err) {
        console.error('Google Auth Callback Error:', err)
        
        const errorMessage = extractErrorMessage(err, OAUTH_ERRORS.UNEXPECTED_ERROR)
        error.value = errorMessage
        
        // Notify parent window of error
        if (window.opener) {
            window.opener.postMessage({
                type: OAUTH_MESSAGE_TYPES.ERROR,
                error: errorMessage
            }, window.location.origin)
        }
    } finally {
        isProcessing.value = false
    }
}

onMounted(() => {
    // Small delay to show the processing state
    setTimeout(() => {
        processAuthCallback()
    }, 500)
})
</script>

<style scoped>
.google-auth-callback {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f9fafb;
    padding: 1rem;
}

.callback-container {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    max-width: 400px;
    width: 100%;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.processing, .success, .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e7eb;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.success-icon, .error-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
}

h2 {
    color: #374151;
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
}

p {
    color: #6b7280;
    margin: 0;
    line-height: 1.5;
}

.help-text {
    font-size: 0.875rem;
    margin-top: 0.5rem;
}

</style> 