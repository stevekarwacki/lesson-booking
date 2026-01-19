/**
 * App Settings Composable with Vue Query
 * 
 * Provides reactive query for fetching all application settings including
 * business information, hours, timezone, branding, etc.
 * 
 * Key Features:
 * - Automatic caching with 5-minute stale time (settings rarely change)
 * - Background refetching for fresh data
 * - Focused getters for specific settings
 * - Business hours validation helpers
 * - Loading and error states handled by Vue Query
 * 
 * @example
 * import { useAppSettings } from '@/composables/useAppSettings'
 * 
 * const { 
 *   settings,
 *   businessHours,
 *   timezone,
 *   companyName,
 *   isSlotWithinHours,
 *   isLoading
 * } = useAppSettings()
 */

import { useQuery } from '@tanstack/vue-query'
import { useUserStore } from '../stores/userStore'
import { computed } from 'vue'

/**
 * Fetch app settings from the API
 * Returns all business, branding, and operational settings
 */
async function fetchAppSettings(token) {
  const response = await fetch('/api/admin/settings', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch app settings')
  }
  
  const data = await response.json()
  return data
}

/**
 * Parse time string (HH:MM) to decimal hours
 * @param {string} timeString - Time in HH:MM format (e.g., "09:00")
 * @returns {number} - Time as decimal hours (e.g., 9.0 for "09:00", 9.5 for "09:30")
 */
function timeToDecimal(timeString) {
  if (!timeString) return 0
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours + (minutes / 60)
}

/**
 * Get the earliest open time across all days
 * @param {Object} businessHours - Business hours configuration
 * @returns {number} - Earliest open time as decimal hours
 */
function getEarliestOpenTime(businessHours) {
  if (!businessHours) return 6 // Default to 6 AM
  
  const openDays = Object.values(businessHours).filter(day => day.isOpen)
  if (openDays.length === 0) return 6 // Default if no days are open
  
  const earliestTime = Math.min(...openDays.map(day => timeToDecimal(day.open)))
  return Math.floor(earliestTime) // Round down to nearest hour
}

/**
 * Get the latest close time across all days
 * @param {Object} businessHours - Business hours configuration
 * @returns {number} - Latest close time as decimal hours
 */
function getLatestCloseTime(businessHours) {
  if (!businessHours) return 19 // Default to 7 PM
  
  const openDays = Object.values(businessHours).filter(day => day.isOpen)
  if (openDays.length === 0) return 19 // Default if no days are open
  
  const latestTime = Math.max(...openDays.map(day => timeToDecimal(day.close)))
  return Math.ceil(latestTime) // Round up to nearest hour
}

/**
 * Check if a specific time slot is within business hours for a given day
 * @param {Object} businessHours - Business hours configuration
 * @param {string} dayOfWeek - Day name (e.g., 'monday', 'tuesday')
 * @param {number} slotTime - Time as decimal hours (e.g., 9.5 for 9:30 AM)
 * @returns {boolean} - True if slot is within business hours
 */
function isWithinBusinessHours(businessHours, dayOfWeek, slotTime) {
  if (!businessHours || !dayOfWeek) return true // Allow all if no config
  
  const dayLower = dayOfWeek.toLowerCase()
  const dayConfig = businessHours[dayLower]
  
  if (!dayConfig || !dayConfig.isOpen) return false // Closed day
  
  const openTime = timeToDecimal(dayConfig.open)
  const closeTime = timeToDecimal(dayConfig.close)
  
  return slotTime >= openTime && slotTime < closeTime
}

/**
 * Main composable hook
 */
export function useAppSettings() {
  const userStore = useUserStore()
  
  // Query for all app settings
  const { 
    data: settings, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => fetchAppSettings(userStore.token),
    staleTime: 5 * 60 * 1000, // 5 minutes (settings rarely change)
    cacheTime: 30 * 60 * 1000, // 30 minutes
    enabled: computed(() => !!userStore.token),
    retry: 2
  })
  
  // Focused getters for specific settings sections
  const business = computed(() => settings.value?.business || {})
  const lessons = computed(() => settings.value?.lessons || {})
  const storage = computed(() => settings.value?.storage || {})
  
  // Specific business setting getters
  const businessHours = computed(() => business.value?.businessHours || null)
  const companyName = computed(() => business.value?.companyName || '')
  const contactEmail = computed(() => business.value?.contactEmail || '')
  const phoneNumber = computed(() => business.value?.phoneNumber || '')
  const address = computed(() => business.value?.address || '')
  const website = computed(() => business.value?.website || '')
  const timezone = computed(() => business.value?.timezone || '')
  const socialMedia = computed(() => business.value?.socialMedia || {})
  
  // Lesson settings getters
  const defaultLessonDuration = computed(() => lessons.value?.defaultDuration || 30)
  const inPersonPaymentEnabled = computed(() => lessons.value?.inPersonPaymentEnabled === true)
  const cardPaymentOnBehalfEnabled = computed(() => lessons.value?.cardPaymentOnBehalfEnabled === true)
  
  // Business hours computed helpers
  const earliestOpenTime = computed(() => {
    return getEarliestOpenTime(businessHours.value)
  })
  
  const latestCloseTime = computed(() => {
    return getLatestCloseTime(businessHours.value)
  })
  
  /**
   * Check if a specific day/time slot is within business hours
   * @param {string} dayOfWeek - Day name (e.g., 'monday', 'tuesday')
   * @param {number} slotTime - Time as decimal hours (e.g., 9.5 for 9:30 AM)
   * @returns {boolean} - True if slot is within business hours
   */
  const isSlotWithinHours = (dayOfWeek, slotTime) => {
    return isWithinBusinessHours(businessHours.value, dayOfWeek, slotTime)
  }
  
  /**
   * Get business hours for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday', 'tuesday')
   * @returns {Object|null} - Day configuration with isOpen, open, close
   */
  const getDayHours = (dayOfWeek) => {
    if (!businessHours.value) return null
    const dayLower = dayOfWeek.toLowerCase()
    return businessHours.value[dayLower] || null
  }
  
  return {
    // Full settings
    settings,
    isLoading,
    error,
    refetch,
    
    // Section getters
    business,
    lessons,
    storage,
    
    // Business info
    businessHours,
    companyName,
    contactEmail,
    phoneNumber,
    address,
    website,
    timezone,
    socialMedia,
    
    // Lesson settings
    defaultLessonDuration,
    inPersonPaymentEnabled,
    cardPaymentOnBehalfEnabled,
    
    // Business hours helpers
    earliestOpenTime,
    latestCloseTime,
    isSlotWithinHours,
    getDayHours
  }
}
