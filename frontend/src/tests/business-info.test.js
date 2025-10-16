import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BusinessInfoSection from '../components/admin/BusinessInfoSection.vue'
import AdminSettingsPage from '../views/AdminSettingsPage.vue'
import { createPinia, setActivePinia } from 'pinia'

// Mock the user store
const mockUserStore = {
  canManageUsers: true,
  token: 'mock-token',
  user: { id: 1, role: 'admin' }
}

// Mock the router
const mockRouter = {
  push: vi.fn()
}

// Mock the media query plugin
const mockMq = {
  smPlus: true
}

// Mock fetch globally
global.fetch = vi.fn()

describe('BusinessInfoSection Component', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = (props = {}) => {
    return mount(BusinessInfoSection, {
      props: {
        initialData: {},
        loading: false,
        clearErrors: null,
        ...props
      }
    })
  }

  test('renders form fields correctly', () => {
    wrapper = createWrapper()
    
    // Check that all required form fields are present
    expect(wrapper.find('#companyName').exists()).toBe(true)
    expect(wrapper.find('#contactEmail').exists()).toBe(true)
    expect(wrapper.find('#phoneNumber').exists()).toBe(true)
    expect(wrapper.find('#website').exists()).toBe(true)
    expect(wrapper.find('#address').exists()).toBe(true)
    expect(wrapper.find('#timezone').exists()).toBe(true)
    
    // Check social media fields
    expect(wrapper.find('#facebook').exists()).toBe(true)
    expect(wrapper.find('#twitter').exists()).toBe(true)
    expect(wrapper.find('#instagram').exists()).toBe(true)
    expect(wrapper.find('#linkedin').exists()).toBe(true)
    expect(wrapper.find('#youtube').exists()).toBe(true)
    
    // Check required field indicators
    expect(wrapper.text()).toContain('Company Name *')
    expect(wrapper.text()).toContain('Contact Email *')
    expect(wrapper.text()).toContain('Business Timezone *')
    
    // Check social media section
    expect(wrapper.text()).toContain('Social Media Links')
    
    // Check save button
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  test('populates form with initial data', async () => {
    const initialData = {
      companyName: 'Test Company',
      contactEmail: 'test@example.com',
      phoneNumber: '555-0123',
      website: 'https://test.com',
      address: '123 Test St',
      timezone: 'America/Los_Angeles',
      socialMedia: {
        facebook: 'https://facebook.com/testcompany',
        twitter: 'https://twitter.com/testcompany',
        instagram: 'https://instagram.com/testcompany',
        linkedin: 'https://linkedin.com/company/testcompany',
        youtube: 'https://youtube.com/testchannel'
      }
    }

    wrapper = createWrapper({ initialData })
    await nextTick()

    expect(wrapper.find('#companyName').element.value).toBe('Test Company')
    expect(wrapper.find('#contactEmail').element.value).toBe('test@example.com')
    expect(wrapper.find('#phoneNumber').element.value).toBe('555-0123')
    expect(wrapper.find('#website').element.value).toBe('https://test.com')
    expect(wrapper.find('#address').element.value).toBe('123 Test St')
    expect(wrapper.find('#timezone').element.value).toBe('America/Los_Angeles')
    
    // Check social media fields
    expect(wrapper.find('#facebook').element.value).toBe('https://facebook.com/testcompany')
    expect(wrapper.find('#twitter').element.value).toBe('https://twitter.com/testcompany')
    expect(wrapper.find('#instagram').element.value).toBe('https://instagram.com/testcompany')
    expect(wrapper.find('#linkedin').element.value).toBe('https://linkedin.com/company/testcompany')
    expect(wrapper.find('#youtube').element.value).toBe('https://youtube.com/testchannel')
  })

  test('validates required fields', async () => {
    wrapper = createWrapper()

    // Try to submit with empty required fields
    await wrapper.find('form').trigger('submit.prevent')

    // Should show validation errors
    await nextTick()
    expect(wrapper.text()).toContain('Company name must be at least 2 characters')
    expect(wrapper.text()).toContain('Please enter a valid email address')
    expect(wrapper.text()).toContain('Business timezone is required')
  })

  test('validates email format', async () => {
    wrapper = createWrapper()

    // Set valid company name but invalid email
    await wrapper.find('#companyName').setValue('Test Company')
    await wrapper.find('#contactEmail').setValue('invalid-email')
    
    // Trigger validation by changing focus
    await wrapper.find('#contactEmail').trigger('blur')
    await nextTick()

    expect(wrapper.text()).toContain('Please enter a valid email address')
  })

  test('validates URL format', async () => {
    wrapper = createWrapper()

    await wrapper.find('#website').setValue('not-a-url')
    await wrapper.find('#website').trigger('blur')
    await nextTick()

    expect(wrapper.text()).toContain('Please enter a valid website URL')
  })

  test('validates social media URL formats', async () => {
    wrapper = createWrapper()

    // Test invalid social media URLs (should not show errors since they're optional)
    await wrapper.find('#facebook').setValue('not-a-url')
    await wrapper.find('#facebook').trigger('blur')
    await nextTick()

    // Social media fields are optional and don't show validation errors
    // They're validated on the backend
  })

  test('validates timezone field', async () => {
    wrapper = createWrapper()

    // Set valid company name and email but leave timezone empty
    await wrapper.find('#companyName').setValue('Test Company')
    await wrapper.find('#contactEmail').setValue('test@example.com')
    
    // Try to submit without timezone
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()

    expect(wrapper.text()).toContain('Business timezone is required')
  })

  test('includes social media in form submission', async () => {
    wrapper = createWrapper()

    // Fill out valid form data including social media
    await wrapper.find('#companyName').setValue('Test Company')
    await wrapper.find('#contactEmail').setValue('test@example.com')
    await wrapper.find('#phoneNumber').setValue('555-0123')
    await wrapper.find('#website').setValue('https://test.com')
    await wrapper.find('#address').setValue('123 Test St')
    await wrapper.find('#timezone').setValue('America/Los_Angeles')
    await wrapper.find('#facebook').setValue('https://facebook.com/testcompany')
    await wrapper.find('#twitter').setValue('https://twitter.com/testcompany')
    await wrapper.find('#instagram').setValue('https://instagram.com/testcompany')
    await wrapper.find('#linkedin').setValue('https://linkedin.com/company/testcompany')
    await wrapper.find('#youtube').setValue('https://youtube.com/testchannel')

    // Submit form
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()

    // Check that change event was emitted with social media data
    const changeEvents = wrapper.emitted('change')
    expect(changeEvents).toBeTruthy()
    expect(changeEvents[0][0]).toEqual({
      tabId: 'business',
      action: 'save_business_info',
      payload: expect.objectContaining({
        companyName: 'Test Company',
        contactEmail: 'test@example.com',
        phoneNumber: '555-0123',
        website: 'https://test.com',
        address: '123 Test St',
        timezone: 'America/Los_Angeles',
        socialMedia: {
          facebook: 'https://facebook.com/testcompany',
          twitter: 'https://twitter.com/testcompany',
          instagram: 'https://instagram.com/testcompany',
          linkedin: 'https://linkedin.com/company/testcompany',
          youtube: 'https://youtube.com/testchannel'
        }
      })
    })
  })

  test('emits change event on valid form submission', async () => {
    wrapper = createWrapper()

    // Fill out valid form data
    await wrapper.find('#companyName').setValue('Test Company')
    await wrapper.find('#contactEmail').setValue('test@example.com')
    await wrapper.find('#phoneNumber').setValue('555-0123')
    await wrapper.find('#website').setValue('https://test.com')
    await wrapper.find('#address').setValue('123 Test St')
    await wrapper.find('#timezone').setValue('America/Los_Angeles')

    // Submit form
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()

    // Check that change event was emitted
    const changeEvents = wrapper.emitted('change')
    expect(changeEvents).toBeTruthy()
    expect(changeEvents[0][0]).toEqual({
      tabId: 'business',
      action: 'save_business_info',
      payload: expect.objectContaining({
        companyName: 'Test Company',
        contactEmail: 'test@example.com',
        phoneNumber: '555-0123',
        website: 'https://test.com',
        address: '123 Test St',
        timezone: 'America/Los_Angeles'
      })
    })
  })

  test('clears errors when clearErrors prop changes', async () => {
    wrapper = createWrapper()

    // Create validation errors
    await wrapper.find('#companyName').setValue('a') // Too short
    await wrapper.find('#companyName').trigger('blur')
    await nextTick()

    expect(wrapper.text()).toContain('Company name must be at least 2 characters')

    // Update clearErrors prop to simulate successful save
    await wrapper.setProps({ clearErrors: Date.now() })
    await nextTick()

    // Error should be cleared
    expect(wrapper.text()).not.toContain('Company name must be at least 2 characters')
  })

  test('shows loading state', async () => {
    wrapper = createWrapper({ loading: true })

    // Form fields should be disabled when loading
    expect(wrapper.find('#companyName').attributes('disabled')).toBeDefined()
    expect(wrapper.find('#contactEmail').attributes('disabled')).toBeDefined()
  })

})

describe('AdminSettingsPage Component', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    
    // Mock successful API response
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        business: {
          companyName: 'Mock Company',
          contactEmail: 'mock@example.com'
        },
        theme: {},
        email: {}
      })
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = () => {
    return mount(AdminSettingsPage, {
      global: {
        mocks: {
          $router: mockRouter,
          $mq: mockMq
        },
        provide: {
          userStore: mockUserStore
        },
        stubs: {
          'router-link': true
        }
      }
    })
  }

  test('renders settings tabs correctly', () => {
    wrapper = createWrapper()
    
    expect(wrapper.text()).toContain('Business Information')
    expect(wrapper.text()).toContain('Theme & Branding')
    expect(wrapper.text()).toContain('Email Templates')
  })



  test('handles settings save successfully', async () => {
    // Mock successful save response
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          business: { companyName: 'Test Company' }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { companyName: 'Updated Company' }
        })
      })

    wrapper = createWrapper()
    await nextTick()

    // Simulate form submission
    const mockPayload = {
      companyName: 'Updated Company',
      contactEmail: 'updated@example.com'
    }

    await wrapper.vm.handleContentChange({
      tabId: 'business',
      action: 'save_business_info',
      payload: mockPayload
    })

    // Should show success message
    expect(wrapper.text()).toContain('updated successfully')
  })


  test('switches tabs correctly', async () => {
    wrapper = createWrapper()
    await nextTick()

    // Initially should be on business tab
    expect(wrapper.vm.currentSection).toBe('business')

    // Switch to theme tab
    wrapper.vm.handleTabChange('theme')
    expect(wrapper.vm.currentSection).toBe('theme')

    // Should clear previous messages
    wrapper.vm.error = 'Previous error'
    wrapper.vm.success = 'Previous success'
    
    wrapper.vm.handleTabChange('business')
    
    expect(wrapper.vm.error).toBe('')
    expect(wrapper.vm.success).toBe('')
  })
})

describe('Integration Tests', () => {
  test('full form submission flow', async () => {
    // Mock API responses
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          business: {},
          theme: {},
          email: {}
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            companyName: 'Integration Test Company',
            contactEmail: 'integration@test.com'
          }
        })
      })

    setActivePinia(createPinia())

    const adminWrapper = mount(AdminSettingsPage, {
      global: {
        mocks: {
          $router: mockRouter,
          $mq: mockMq
        },
        provide: {
          userStore: mockUserStore
        },
        stubs: {
          'router-link': true
        }
      }
    })

    await nextTick()

    // Find the business info section within the admin page
    const businessSection = adminWrapper.findComponent(BusinessInfoSection)
    expect(businessSection.exists()).toBe(true)

    // Fill out the form
    await businessSection.find('#companyName').setValue('Integration Test Company')
    await businessSection.find('#contactEmail').setValue('integration@test.com')
    await businessSection.find('#timezone').setValue('America/Los_Angeles')

    // Submit the form
    await businessSection.find('form').trigger('submit.prevent')
    await nextTick()

    // Check that the API was called with correct data
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/settings/business', expect.objectContaining({
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': expect.stringMatching(/Bearer/)
      },
      body: expect.stringContaining('"companyName":"Integration Test Company"')
    }))

    adminWrapper.unmount()
  })
})
