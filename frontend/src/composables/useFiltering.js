import { ref, computed, watch } from 'vue'

/**
 * Generic filtering composable for handling filter state and data filtering
 * @param {Object} options - Configuration options
 * @param {Array} options.filters - Array of filter definitions
 * @param {Function} options.filterFunction - Custom filter function (optional)
 * @param {*} options.defaultFilter - Default active filter
 * @returns {Object} Filtering state and methods
 */
export function useFiltering(options = {}) {
  const {
    filters = [],
    filterFunction = null,
    defaultFilter = null
  } = options

  // State
  const activeFilter = ref(defaultFilter || (filters.length > 0 ? filters[0].value : null))
  const data = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // Computed
  const filteredData = computed(() => {
    if (!data.value || data.value.length === 0) {
      return []
    }

    if (!activeFilter.value) {
      return data.value
    }

    // Use custom filter function if provided
    if (filterFunction) {
      return filterFunction(data.value, activeFilter.value)
    }

    // Default filtering logic for common patterns
    return defaultFilterLogic(data.value, activeFilter.value)
  })

  const activeFilterConfig = computed(() => {
    return filters.find(f => f.value === activeFilter.value) || null
  })

  const filterCounts = computed(() => {
    const counts = {}
    
    filters.forEach(filter => {
      if (filterFunction) {
        counts[filter.value] = filterFunction(data.value, filter.value).length
      } else {
        counts[filter.value] = defaultFilterLogic(data.value, filter.value).length
      }
    })
    
    return counts
  })

  // Methods
  const setFilter = (filterValue) => {
    activeFilter.value = filterValue
  }

  const setData = (newData) => {
    data.value = newData || []
  }

  const updateData = (updatedData) => {
    data.value = updatedData || []
  }

  const clearData = () => {
    data.value = []
  }

  const setLoading = (loading) => {
    isLoading.value = loading
  }

  const setError = (errorMessage) => {
    error.value = errorMessage
  }

  const clearError = () => {
    error.value = null
  }

  // Reset to default filter
  const resetFilter = () => {
    activeFilter.value = defaultFilter || (filters.length > 0 ? filters[0].value : null)
  }

  // Default filter logic for common booking patterns
  function defaultFilterLogic(items, filterValue) {
    if (!filterValue || !items) return items

    const now = new Date()
    
    switch (filterValue) {
      case 'today':
        return items.filter(item => {
          const itemDate = new Date(item.date || item.start_time || item.created_at)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          
          return itemDate >= today && itemDate < tomorrow && (item.status !== 'cancelled' && item.status !== 'canceled')
        })
        
      case 'upcoming':
        return items.filter(item => {
          const itemDate = new Date(item.date || item.start_time || item.created_at)
          return itemDate >= now && (item.status !== 'cancelled' && item.status !== 'canceled')
        })
        
      case 'past':
        return items.filter(item => {
          const itemDate = new Date(item.date || item.start_time || item.created_at)
          return itemDate < now && (item.status !== 'cancelled' && item.status !== 'canceled')
        })
        
      case 'cancelled':
      case 'canceled':
        return items.filter(item => 
          item.status === 'cancelled' || item.status === 'canceled'
        )
        
      case 'active':
        return items.filter(item => 
          item.status === 'active' || item.status === 'booked' || !item.status
        )
        
      case 'all':
        return items
        
      default:
        // For other filters, assume it's a status or property match
        return items.filter(item => {
          // Check if filter matches status
          if (item.status === filterValue) return true
          
          // Check if filter matches a boolean property
          if (typeof item[filterValue] === 'boolean') return item[filterValue]
          
          // Check if filter matches a string property
          if (typeof item[filterValue] === 'string') return item[filterValue] === filterValue
          
          return false
        })
    }
  }

  // Watch for filter changes to clear errors
  watch(activeFilter, () => {
    clearError()
  })

  return {
    // State
    activeFilter,
    data,
    isLoading,
    error,
    
    // Computed
    filteredData,
    activeFilterConfig,
    filterCounts,
    
    // Methods
    setFilter,
    setData,
    updateData,
    clearData,
    setLoading,
    setError,
    clearError,
    resetFilter
  }
}

/**
 * Preset filter configurations for common use cases
 */
export const filterPresets = {
  bookings: [
    { label: 'Today', value: 'today', icon: '📍' },
    { label: 'Upcoming', value: 'upcoming', icon: '📅' },
    { label: 'Past', value: 'past', icon: '📋' },
    { label: 'Cancelled', value: 'cancelled', icon: '❌' }
  ],
  
  users: [
    { label: 'All', value: 'all', icon: '👥' },
    { label: 'Active', value: 'active', icon: '✅' },
    { label: 'Inactive', value: 'inactive', icon: '⏸️' }
  ],
  
  instructors: [
    { label: 'All', value: 'all', icon: '👨‍🏫' },
    { label: 'Active', value: 'active', icon: '✅' },
    { label: 'Inactive', value: 'inactive', icon: '⏸️' }
  ]
}

/**
 * Helper function to create booking-specific filtering
 * @param {Object} options - Configuration options
 * @returns {Object} Configured filtering composable
 */
export function useBookingFiltering(options = {}) {
  const defaultOptions = {
    filters: filterPresets.bookings,
    defaultFilter: 'today',
    ...options
  }
  
  return useFiltering(defaultOptions)
}

/**
 * Helper function to create user-specific filtering  
 * @param {Object} options - Configuration options
 * @returns {Object} Configured filtering composable
 */
export function useUserFiltering(options = {}) {
  const defaultOptions = {
    filters: filterPresets.users,
    defaultFilter: 'all',
    ...options
  }
  
  return useFiltering(defaultOptions)
}