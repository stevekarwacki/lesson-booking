import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { useCalendar } from '../composables/useCalendar'
import { useUserStore } from '../stores/userStore'

// Mock fetch globally
global.fetch = vi.fn()

// Create a test component that uses the composable
const TestComponent = defineComponent({
  props: {
    instructorId: Number,
    startDate: String,
    endDate: String,
    selectedDate: String,
  },
  setup(props) {
    const calendarData = useCalendar(
      ref(props.instructorId),
      ref(props.startDate),
      ref(props.endDate),
      ref(props.selectedDate)
    )
    return { calendarData }
  },
  render() {
    return h('div', 'Test')
  }
})

describe('useCalendar Composable', () => {
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
    userStore.user = { id: 1, role: 'student' }
    
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
        startDate: '2025-01-20',
        endDate: '2025-01-26',
        selectedDate: '2025-01-20',
        ...props
      },
      global: {
        plugins: [[VueQueryPlugin, { queryClient }]]
      }
    })
  }

  describe('Weekly Events Query', () => {
    it('should provide weeklyEvents query state', () => {
      wrapper = createWrapper()
      
      const { weeklyEvents, isLoadingWeeklyEvents, weeklyEventsError } = wrapper.vm.calendarData
      
      expect(weeklyEvents).toBeDefined()
      expect(isLoadingWeeklyEvents).toBeDefined()
      expect(weeklyEventsError).toBeDefined()
    })

    it('should construct correct query key for weekly events', () => {
      wrapper = createWrapper({
        instructorId: 5,
        startDate: '2025-02-01',
        endDate: '2025-02-07',
      })
      
      // Query key should follow hierarchical pattern
      const queries = queryClient.getQueryCache().getAll()
      const weeklyQuery = queries.find(q => 
        q.queryKey[0] === 'calendar' && 
        q.queryKey[2] === 5 &&
        q.queryKey[3] === 'weekly'
      )
      
      expect(weeklyQuery).toBeDefined()
    })

    it('should not run query when instructor ID is missing', () => {
      wrapper = createWrapper({ instructorId: null })
      
      const { isLoadingWeeklyEvents } = wrapper.vm.calendarData
      
      // Query should be disabled, so loading should be false
      expect(isLoadingWeeklyEvents.value).toBe(false)
    })

    it('should not run query when dates are missing', () => {
      wrapper = createWrapper({ 
        instructorId: 1,
        startDate: null,
        endDate: null
      })
      
      const { isLoadingWeeklyEvents } = wrapper.vm.calendarData
      
      // Query should be disabled
      expect(isLoadingWeeklyEvents.value).toBe(false)
    })
  })

  describe('Daily Events Query', () => {
    it('should provide dailyEvents query state', () => {
      wrapper = createWrapper()
      
      const { dailyEvents, isLoadingDailyEvents, dailyEventsError } = wrapper.vm.calendarData
      
      expect(dailyEvents).toBeDefined()
      expect(isLoadingDailyEvents).toBeDefined()
      expect(dailyEventsError).toBeDefined()
    })

    it('should construct correct query key for daily events', () => {
      wrapper = createWrapper({
        instructorId: 3,
        selectedDate: '2025-03-15',
      })
      
      // Query key should follow hierarchical pattern
      const queries = queryClient.getQueryCache().getAll()
      const dailyQuery = queries.find(q => 
        q.queryKey[0] === 'calendar' && 
        q.queryKey[2] === 3 &&
        q.queryKey[3] === 'daily'
      )
      
      expect(dailyQuery).toBeDefined()
    })

    it('should not run query when instructor ID is missing', () => {
      wrapper = createWrapper({ instructorId: null })
      
      const { isLoadingDailyEvents } = wrapper.vm.calendarData
      
      // Query should be disabled
      expect(isLoadingDailyEvents.value).toBe(false)
    })

    it('should not run query when selected date is missing', () => {
      wrapper = createWrapper({ selectedDate: null })
      
      const { isLoadingDailyEvents } = wrapper.vm.calendarData
      
      // Query should be disabled
      expect(isLoadingDailyEvents.value).toBe(false)
    })
  })

  describe('Query Refetch Functions', () => {
    it('should provide refetch functions', () => {
      wrapper = createWrapper()
      
      const { refetchWeeklyEvents, refetchDailyEvents } = wrapper.vm.calendarData
      
      expect(typeof refetchWeeklyEvents).toBe('function')
      expect(typeof refetchDailyEvents).toBe('function')
    })
  })

  describe('Cache Configuration', () => {
    it('should use short stale time for real-time data', async () => {
      wrapper = createWrapper()
      
      // Find the weekly events query
      const queries = queryClient.getQueryCache().getAll()
      const weeklyQuery = queries.find(q => 
        q.queryKey[0] === 'calendar' && 
        q.queryKey[3] === 'weekly'
      )
      
      // Stale time should be 30 seconds (30000ms)
      if (weeklyQuery) {
        expect(weeklyQuery.options.staleTime).toBe(30 * 1000)
      }
    })
  })

  describe('Parameter Normalization', () => {
    it('should handle ref parameters correctly', () => {
      const instructorId = ref(7)
      const startDate = ref('2025-04-01')
      const endDate = ref('2025-04-07')
      
      wrapper = createWrapper({
        instructorId: instructorId.value,
        startDate: startDate.value,
        endDate: endDate.value,
      })
      
      // Should construct query without errors
      const { weeklyEvents } = wrapper.vm.calendarData
      expect(weeklyEvents).toBeDefined()
    })
  })

  describe('Authentication', () => {
    it('should not run queries when token is missing', () => {
      userStore.token = null
      
      wrapper = createWrapper()
      
      const { isLoadingWeeklyEvents, isLoadingDailyEvents } = wrapper.vm.calendarData
      
      // Queries should be disabled without token
      expect(isLoadingWeeklyEvents.value).toBe(false)
      expect(isLoadingDailyEvents.value).toBe(false)
    })
  })
})
