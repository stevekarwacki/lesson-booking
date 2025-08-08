/**
 * Timezone Store
 * 
 * Manages user timezone preferences and provides timezone-aware utilities
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { 
    getUserTimezone, 
    getTimezoneDisplayName, 
    getTimezoneAbbreviation,
    utcSlotToLocalTime,
    localTimeToUTCSlot,
    formatSlotForDisplay
} from '../utils/timeFormatting'

export const useTimezoneStore = defineStore('timezone', () => {
    // State
    const userTimezone = ref(getUserTimezone())
    const use12HourFormat = ref(true)
    const autoDetect = ref(true)
    
    // Getters
    const timezoneDisplayName = computed(() => getTimezoneDisplayName(userTimezone.value))
    const timezoneAbbreviation = computed(() => getTimezoneAbbreviation(userTimezone.value))
    
    const isUTC = computed(() => userTimezone.value === 'UTC')
    
    // Actions
    function setTimezone(timezone) {
        userTimezone.value = timezone
        autoDetect.value = false
        
        // Store in localStorage for persistence
        try {
            localStorage.setItem('user_timezone', timezone)
            localStorage.setItem('timezone_auto_detect', 'false')
        } catch (error) {
            console.warn('Could not save timezone preference to localStorage')
        }
    }
    
    function setUse12HourFormat(use12Hour) {
        use12HourFormat.value = use12Hour
        
        try {
            localStorage.setItem('use_12_hour_format', use12Hour.toString())
        } catch (error) {
            console.warn('Could not save time format preference to localStorage')
        }
    }
    
    function enableAutoDetect() {
        autoDetect.value = true
        userTimezone.value = getUserTimezone()
        
        try {
            localStorage.setItem('timezone_auto_detect', 'true')
            localStorage.removeItem('user_timezone')
        } catch (error) {
            console.warn('Could not save auto-detect preference to localStorage')
        }
    }
    
    function loadFromStorage() {
        try {
            const savedAutoDetect = localStorage.getItem('timezone_auto_detect')
            const savedTimezone = localStorage.getItem('user_timezone')
            const savedTimeFormat = localStorage.getItem('use_12_hour_format')
            
            if (savedAutoDetect === 'false' && savedTimezone) {
                userTimezone.value = savedTimezone
                autoDetect.value = false
            } else {
                userTimezone.value = getUserTimezone()
                autoDetect.value = true
            }
            
            if (savedTimeFormat !== null) {
                use12HourFormat.value = savedTimeFormat === 'true'
            }
        } catch (error) {
            console.warn('Could not load timezone preferences from localStorage')
        }
    }
    
    // Utility functions that use the store's timezone
    function convertUTCSlotToLocal(slot, dateString) {
        return utcSlotToLocalTime(slot, dateString, userTimezone.value)
    }
    
    function convertLocalTimeToUTCSlot(timeString, dateString) {
        return localTimeToUTCSlot(timeString, dateString, userTimezone.value)
    }
    
    function formatSlot(slot, dateString) {
        return formatSlotForDisplay(slot, dateString, userTimezone.value, use12HourFormat.value)
    }
    
    function formatTimeWithTimezone(time, dateString) {
        // Convert HH:MM time to a slot, then format it properly
        try {
            const [hours, minutes] = time.split(':').map(Number)
            const slot = hours * 4 + Math.floor(minutes / 15)
            return formatSlot(slot, dateString)
        } catch (error) {
            console.error('Error formatting time with timezone:', error)
            return time
        }
    }
    
    // List of common timezones for timezone selector
    const commonTimezones = [
        'UTC',
        'America/New_York',    // Eastern Time
        'America/Chicago',     // Central Time
        'America/Denver',      // Mountain Time
        'America/Los_Angeles', // Pacific Time
        'America/Toronto',     // Eastern Time (Canada)
        'America/Vancouver',   // Pacific Time (Canada)
        'Europe/London',       // GMT/BST
        'Europe/Paris',        // CET/CEST
        'Europe/Berlin',       // CET/CEST
        'Europe/Rome',         // CET/CEST
        'Europe/Madrid',       // CET/CEST
        'Asia/Tokyo',          // JST
        'Asia/Shanghai',       // CST
        'Asia/Kolkata',        // IST
        'Australia/Sydney',    // AEST/AEDT
        'Australia/Melbourne', // AEST/AEDT
        'Pacific/Auckland',    // NZST/NZDT
    ]
    
    function getTimezoneOptions() {
        return commonTimezones.map(tz => ({
            value: tz,
            label: getTimezoneDisplayName(tz),
            abbreviation: getTimezoneAbbreviation(tz)
        }))
    }
    
    // Initialize from storage on store creation
    loadFromStorage()
    
    return {
        // State
        userTimezone,
        use12HourFormat,
        autoDetect,
        
        // Getters
        timezoneDisplayName,
        timezoneAbbreviation,
        isUTC,
        
        // Actions
        setTimezone,
        setUse12HourFormat,
        enableAutoDetect,
        loadFromStorage,
        
        // Utility functions
        convertUTCSlotToLocal,
        convertLocalTimeToUTCSlot,
        formatSlot,
        formatTimeWithTimezone,
        getTimezoneOptions,
        
        // Constants
        commonTimezones
    }
})