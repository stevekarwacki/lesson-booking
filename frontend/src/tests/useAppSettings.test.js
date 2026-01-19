import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useAppSettings } from '../composables/useAppSettings'

// Mock fetch globally
global.fetch = vi.fn()

// Create a test component that uses the composable
const TestComponent = defineComponent({
  setup() {
    const appSettings = useAppSettings()
    return { appSettings }
  },
  render() {
    return h('div', 'Test')
  }
})

describe('useAppSettings Composable', () => {
  let queryClient
  let wrapper

  beforeEach(() => {
    // Create fresh instances for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    queryClient.clear()
  })

  const createWrapper = () => {
    return mount(TestComponent, {
      global: {
        plugins: [[VueQueryPlugin, { queryClient }]]
      }
    })
  }

  describe('Business Hours Fetching', () => {
    it('should provide businessHours computed property', () => {
      wrapper = createWrapper()
      
      const { businessHours } = wrapper.vm.appSettings
      // businessHours should be a reactive ref
      expect(businessHours.value).toBeDefined()
    })

    it('should provide earliestOpenTime with defaults', () => {
      wrapper = createWrapper()

      const { earliestOpenTime } = wrapper.vm.appSettings
      // Should return a valid number (default fallback)
      expect(typeof earliestOpenTime.value).toBe('number')
      expect(earliestOpenTime.value).toBeGreaterThanOrEqual(0)
      expect(earliestOpenTime.value).toBeLessThanOrEqual(24)
    })

    it('should provide latestCloseTime with defaults', () => {
      wrapper = createWrapper()

      const { latestCloseTime } = wrapper.vm.appSettings
      // Should return a valid number (default fallback)
      expect(typeof latestCloseTime.value).toBe('number')
      expect(latestCloseTime.value).toBeGreaterThanOrEqual(0)
      expect(latestCloseTime.value).toBeLessThanOrEqual(24)
      // Close time should be after open time
      const { earliestOpenTime } = wrapper.vm.appSettings
      expect(latestCloseTime.value).toBeGreaterThan(earliestOpenTime.value)
    })
  })

  describe('Slot Validation', () => {
    it('should provide isSlotWithinHours function', () => {
      wrapper = createWrapper()
      const { isSlotWithinHours } = wrapper.vm.appSettings
      
      // Function should exist and be callable
      expect(typeof isSlotWithinHours).toBe('function')
      
      // Should return boolean
      const result = isSlotWithinHours('monday', 12)
      expect(typeof result).toBe('boolean')
    })

    it('should validate slots with default business hours', () => {
      wrapper = createWrapper()
      const { isSlotWithinHours, earliestOpenTime, latestCloseTime } = wrapper.vm.appSettings
      
      // Slots within the default range should be valid
      const midpoint = (earliestOpenTime.value + latestCloseTime.value) / 2
      expect(isSlotWithinHours('monday', midpoint)).toBe(true)
    })

    it('should be permissive when business hours are not loaded', () => {
      wrapper = createWrapper()
      const { isSlotWithinHours } = wrapper.vm.appSettings
      
      // When data isn't loaded, composable returns true to be permissive
      // This prevents blocking UI while data is loading
      expect(isSlotWithinHours('monday', 2)).toBe(true)
      expect(isSlotWithinHours('monday', 23)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should provide fallback defaults', () => {
      wrapper = createWrapper()

      const { businessHours, earliestOpenTime, latestCloseTime } = wrapper.vm.appSettings
      
      // Should always provide some value (either from API or defaults)
      expect(earliestOpenTime.value).toBeDefined()
      expect(latestCloseTime.value).toBeDefined()
      
      // Even if business hours aren't loaded, helpers should work
      const { isSlotWithinHours } = wrapper.vm.appSettings
      expect(() => isSlotWithinHours('monday', 12)).not.toThrow()
    })
  })
})
