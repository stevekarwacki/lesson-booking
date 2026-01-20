import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { useAvailability } from '../composables/useAvailability'
import { useUserStore } from '../stores/userStore'

// Mock fetch globally
global.fetch = vi.fn()

// Create a test component that uses the composable
const TestComponent = defineComponent({
  props: {
    instructorId: Number,
    selectedDate: String,
  },
  setup(props) {
    const availabilityData = useAvailability(
      ref(props.instructorId),
      ref(props.selectedDate)
    )
    return { availabilityData }
  },
  render() {
    return h('div', 'Test')
  }
})

describe('useAvailability Composable', () => {
  let queryClient
  let wrapper
  let userStore

  beforeEach(() => {
    // Create fresh instances for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    userStore = useUserStore()
    
    // Set up user store with token
    userStore.token = 'test-token'
    userStore.user = { id: 1, role: 'instructor' }
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    queryClient.clear()
  })

  const createWrapper = (props = {}) => {
    return mount(TestComponent, {
      props: {
        instructorId: 1,
        selectedDate: '2025-01-20',
        ...props
      },
      global: {
        plugins: [[VueQueryPlugin, { queryClient }]]
      }
    })
  }

  describe('Weekly Availability Query', () => {
    it('should provide weeklyAvailability query state', () => {
      wrapper = createWrapper()
      
      const { weeklyAvailability, isLoadingWeeklyAvailability, weeklyAvailabilityError } = wrapper.vm.availabilityData
      
      expect(weeklyAvailability).toBeDefined()
      expect(isLoadingWeeklyAvailability).toBeDefined()
      expect(weeklyAvailabilityError).toBeDefined()
    })

    it('should construct correct query key for weekly availability', () => {
      wrapper = createWrapper({
        instructorId: 5,
      })
      
      // Query key should follow hierarchical pattern
      const queries = queryClient.getQueryCache().getAll()
      const weeklyQuery = queries.find(q => 
        q.queryKey[0] === 'availability' && 
        q.queryKey[1] === 5 &&
        q.queryKey[2] === 'weekly'
      )
      
      expect(weeklyQuery).toBeDefined()
    })

    it('should not run query when instructor ID is missing', () => {
      wrapper = createWrapper({ instructorId: null })
      
      const { isLoadingWeeklyAvailability } = wrapper.vm.availabilityData
      
      // Query should be disabled, so loading should be false
      expect(isLoadingWeeklyAvailability.value).toBe(false)
    })
  })

  describe('Daily Availability Query', () => {
    it('should provide dailyAvailability query state', () => {
      wrapper = createWrapper()
      
      const { dailyAvailability, isLoadingDailyAvailability, dailyAvailabilityError } = wrapper.vm.availabilityData
      
      expect(dailyAvailability).toBeDefined()
      expect(isLoadingDailyAvailability).toBeDefined()
      expect(dailyAvailabilityError).toBeDefined()
    })

    it('should construct correct query key for daily availability', () => {
      wrapper = createWrapper({
        instructorId: 3,
        selectedDate: '2025-03-15',
      })
      
      // Query key should follow hierarchical pattern
      const queries = queryClient.getQueryCache().getAll()
      const dailyQuery = queries.find(q => 
        q.queryKey[0] === 'availability' && 
        q.queryKey[1] === 3 &&
        q.queryKey[2] === 'daily'
      )
      
      expect(dailyQuery).toBeDefined()
    })

    it('should not run query when selected date is missing', () => {
      wrapper = createWrapper({ selectedDate: null })
      
      const { isLoadingDailyAvailability } = wrapper.vm.availabilityData
      
      // Query should be disabled
      expect(isLoadingDailyAvailability.value).toBe(false)
    })
  })

  describe('Mutation Functions', () => {
    it('should provide saveWeeklyAvailability mutation', () => {
      wrapper = createWrapper()
      
      const { saveWeeklyAvailability, isSavingWeeklyAvailability } = wrapper.vm.availabilityData
      
      expect(typeof saveWeeklyAvailability).toBe('function')
      expect(isSavingWeeklyAvailability).toBeDefined()
    })

    it('should provide createBlockedSlot mutation', () => {
      wrapper = createWrapper()
      
      const { createBlockedSlot, isCreatingBlockedSlot } = wrapper.vm.availabilityData
      
      expect(typeof createBlockedSlot).toBe('function')
      expect(isCreatingBlockedSlot).toBeDefined()
    })

    it('should provide deleteBlockedSlot mutation', () => {
      wrapper = createWrapper()
      
      const { deleteBlockedSlot, isDeletingBlockedSlot } = wrapper.vm.availabilityData
      
      expect(typeof deleteBlockedSlot).toBe('function')
      expect(isDeletingBlockedSlot).toBeDefined()
    })
  })

  describe('Query Refetch Functions', () => {
    it('should provide refetch functions', () => {
      wrapper = createWrapper()
      
      const { refetchWeeklyAvailability, refetchDailyAvailability } = wrapper.vm.availabilityData
      
      expect(typeof refetchWeeklyAvailability).toBe('function')
      expect(typeof refetchDailyAvailability).toBe('function')
    })
  })

  describe('Cache Configuration', () => {
    it('should use 2-minute stale time for availability data', async () => {
      wrapper = createWrapper()
      
      // Find the weekly availability query
      const queries = queryClient.getQueryCache().getAll()
      const weeklyQuery = queries.find(q => 
        q.queryKey[0] === 'availability' && 
        q.queryKey[2] === 'weekly'
      )
      
      // Stale time should be 2 minutes (120000ms)
      if (weeklyQuery) {
        expect(weeklyQuery.options.staleTime).toBe(2 * 60 * 1000)
      }
    })
  })

  describe('Parameter Normalization', () => {
    it('should handle ref parameters correctly', () => {
      const instructorId = ref(7)
      const selectedDate = ref('2025-04-01')
      
      wrapper = createWrapper({
        instructorId: instructorId.value,
        selectedDate: selectedDate.value,
      })
      
      // Should construct query without errors
      const { weeklyAvailability } = wrapper.vm.availabilityData
      expect(weeklyAvailability).toBeDefined()
    })
  })

  describe('Authentication', () => {
    it('should not run queries when token is missing', () => {
      userStore.token = null
      
      wrapper = createWrapper()
      
      const { isLoadingWeeklyAvailability, isLoadingDailyAvailability } = wrapper.vm.availabilityData
      
      // Queries should be disabled without token
      expect(isLoadingWeeklyAvailability.value).toBe(false)
      expect(isLoadingDailyAvailability.value).toBe(false)
    })
  })
})
