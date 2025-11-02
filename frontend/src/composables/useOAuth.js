import { ref, computed } from 'vue'
import axios from 'axios'

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
    if (!instructorId?.value && !instructorId) return

    const id = instructorId?.value || instructorId
    
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
        error.value = err.response?.data?.message || 'Failed to check OAuth status'
      }
    } finally {
      loading.value = false
    }
  }

  // Connect via OAuth
  const connect = async () => {
    if (!instructorId?.value && !instructorId) return

    const id = instructorId?.value || instructorId

    try {
      connecting.value = true
      clearError()

      // Get authorization URL
      const response = await axios.post(`/api/auth/google/authorize/${id}`)
      const authUrl = response.data.url

      // Open OAuth popup
      const popup = window.open(
        authUrl,
        'google-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups and try again.')
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

          if (event.data?.type === 'oauth-success') {
            messageReceived = true
            window.removeEventListener('message', handleMessage)
            if (timeoutId) clearTimeout(timeoutId)
            
            // Wait a moment for backend to finish
            setTimeout(async () => {
              await checkStatus()
              connecting.value = false
              resolve(oauthStatus.value.connected)
            }, 1000)
          } else if (event.data?.type === 'oauth-error') {
            messageReceived = true
            window.removeEventListener('message', handleMessage)
            if (timeoutId) clearTimeout(timeoutId)
            connecting.value = false
            reject(new Error(event.data.error || 'OAuth failed'))
          } else if (event.data?.type === 'oauth-cancelled') {
            messageReceived = true
            window.removeEventListener('message', handleMessage)
            if (timeoutId) clearTimeout(timeoutId)
            connecting.value = false
            reject(new Error('OAuth cancelled by user'))
          }
        }

        window.addEventListener('message', handleMessage)

        // Timeout after 5 minutes
        timeoutId = setTimeout(() => {
          window.removeEventListener('message', handleMessage)
          
          if (!messageReceived) {
            connecting.value = false
            reject(new Error('OAuth timeout - please try again'))
          }
        }, 5 * 60 * 1000)
      })

    } catch (err) {
      connecting.value = false
      error.value = err.message || 'Failed to start OAuth connection'
      throw err
    }
  }

  // Disconnect OAuth
  const disconnect = async () => {
    if (!instructorId?.value && !instructorId) return

    const id = instructorId?.value || instructorId

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
      error.value = err.response?.data?.message || 'Failed to disconnect OAuth'
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