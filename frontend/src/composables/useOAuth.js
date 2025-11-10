import { ref, computed } from 'vue'
import axios from 'axios'
import { 
  OAUTH_ERRORS, 
  OAUTH_TIMEOUTS, 
  OAUTH_POPUP_CONFIG, 
  OAUTH_MESSAGE_TYPES 
} from '../constants/oauthConstants'
import { extractErrorMessage } from '../utils/errorHelpers'

/**
 * OAuth Status Composable
 * Provides reusable OAuth state management for Google services
 */
export function useOAuth(instructorId) {
  // Reactive state
  const loading = ref(false)
  const error = ref(null)
  const connecting = ref(false)
  const disconnecting = ref(false)
  
  const oauthStatus = ref({
    available: false,
    connected: false,
    connectedAt: null,
    scopes: null,
    expiresAt: null,
    canRefresh: false
  })

  // Computed properties
  const isConnected = computed(() => oauthStatus.value.connected)
  const hasCalendarAccess = computed(() => 
    oauthStatus.value.scopes?.includes('calendar') || false
  )
  const hasEmailAccess = computed(() => 
    oauthStatus.value.scopes?.includes('gmail') || false
  )
  const isExpired = computed(() => {
    if (!oauthStatus.value.expiresAt) return false
    return new Date(oauthStatus.value.expiresAt) <= new Date()
  })

  // Helper to extract instructor ID from ref or value
  const getInstructorId = () => {
    if (!instructorId?.value && !instructorId) return null
    return instructorId?.value || instructorId
  }

  // Format scopes for display
  const formatScopes = (scopes) => {
    if (!scopes) return []
    return scopes.split(' ').map(scope => {
      if (scope.includes('calendar')) return { type: 'calendar', name: 'Calendar', icon: '📅' }
      if (scope.includes('gmail')) return { type: 'email', name: 'Gmail', icon: '📧' }
      return { type: 'unknown', name: scope, icon: '🔧' }
    })
  }

  // Clear error state
  const clearError = () => {
    error.value = null
  }

  // Check OAuth status
  const checkStatus = async () => {
    const id = getInstructorId()
    if (!id) return
    
    try {
      loading.value = true
      clearError()

      const response = await axios.get(`/api/auth/google/status/${id}`)
      oauthStatus.value = {
        available: true,
        connected: response.data.connected || false,
        connectedAt: response.data.connectedAt || null,
        scopes: response.data.scope || null,
        expiresAt: response.data.expiresAt || null,
        canRefresh: response.data.canRefresh || false
      }

    } catch (err) {
      oauthStatus.value = {
        available: false,
        connected: false,
        connectedAt: null,
        scopes: null,
        expiresAt: null,
        canRefresh: false
      }
      
      // Don't set error for 404/503 - just means OAuth not configured
      if (err.response?.status !== 404 && err.response?.status !== 503) {
        error.value = extractErrorMessage(err, OAUTH_ERRORS.STATUS_CHECK_FAILED)
      }
    } finally {
      loading.value = false
    }
  }

  // Connect via OAuth
  const connect = async () => {
    const id = getInstructorId()
    if (!id) return

    try {
      connecting.value = true
      clearError()

      // Get authorization URL
      const response = await axios.post(`/api/auth/google/authorize/${id}`)
      const authUrl = response.data.url

      // Open OAuth popup
      const popup = window.open(
        authUrl,
        OAUTH_POPUP_CONFIG.NAME,
        OAUTH_POPUP_CONFIG.FEATURES
      )

      if (!popup) {
        throw new Error(OAUTH_ERRORS.POPUP_BLOCKED)
      }

      // Use message passing exclusively to avoid COOP issues
      return new Promise((resolve, reject) => {
        let messageReceived = false
        let timeoutId = null

        // Listen for message from popup
        const handleMessage = async (event) => {
          // Verify message is from our app
          if (event.origin !== window.location.origin) {
            return
          }

          if (event.data?.type === OAUTH_MESSAGE_TYPES.SUCCESS) {
            messageReceived = true
            window.removeEventListener('message', handleMessage)
            if (timeoutId) clearTimeout(timeoutId)
            
            // Wait a moment for backend to finish
            setTimeout(async () => {
              await checkStatus()
              connecting.value = false
              resolve(oauthStatus.value.connected)
            }, OAUTH_TIMEOUTS.BACKEND_SETTLE_MS)
          } else if (event.data?.type === OAUTH_MESSAGE_TYPES.ERROR) {
            messageReceived = true
            window.removeEventListener('message', handleMessage)
            if (timeoutId) clearTimeout(timeoutId)
            connecting.value = false
            reject(new Error(event.data.error || OAUTH_ERRORS.OAUTH_FAILED))
          } else if (event.data?.type === OAUTH_MESSAGE_TYPES.CANCELLED) {
            messageReceived = true
            window.removeEventListener('message', handleMessage)
            if (timeoutId) clearTimeout(timeoutId)
            connecting.value = false
            reject(new Error(OAUTH_ERRORS.OAUTH_CANCELLED))
          }
        }

        window.addEventListener('message', handleMessage)

        // Timeout after configured duration
        timeoutId = setTimeout(() => {
          window.removeEventListener('message', handleMessage)
          
          if (!messageReceived) {
            connecting.value = false
            reject(new Error(OAUTH_ERRORS.OAUTH_TIMEOUT))
          }
        }, OAUTH_TIMEOUTS.OAUTH_TIMEOUT_MS)
      })

    } catch (err) {
      connecting.value = false
      error.value = extractErrorMessage(err, OAUTH_ERRORS.CONNECTION_FAILED)
      throw err
    }
  }

  // Disconnect OAuth
  const disconnect = async () => {
    const id = getInstructorId()
    if (!id) return

    try {
      disconnecting.value = true
      clearError()

      await axios.delete(`/api/auth/google/disconnect/${id}`)
      
      // Update status immediately
      oauthStatus.value.connected = false
      oauthStatus.value.connectedAt = null
      oauthStatus.value.scopes = null
      oauthStatus.value.expiresAt = null

      // Refresh full status
      await checkStatus()

    } catch (err) {
      error.value = extractErrorMessage(err, OAUTH_ERRORS.DISCONNECT_FAILED)
      throw err
    } finally {
      disconnecting.value = false
    }
  }

  return {
    // State
    loading,
    error,
    connecting,
    disconnecting,
    oauthStatus,

    // Computed
    isConnected,
    hasCalendarAccess,
    hasEmailAccess,
    isExpired,

    // Methods
    checkStatus,
    connect,
    disconnect,
    clearError,
    formatScopes
  }
}