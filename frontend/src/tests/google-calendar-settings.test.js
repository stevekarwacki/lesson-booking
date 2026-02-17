import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import GoogleCalendarSettings from '../components/GoogleCalendarSettings.vue'

const mockSaveCalendarConfig = vi.fn()
const mockTestConnection = vi.fn()

let mockSetupInfo = ref(null)
let mockCalendarConfig = ref(null)
let mockCalendarMethod = computed(() => mockSetupInfo.value?.method || null)

vi.mock('../composables/useGoogleCalendar', () => ({
    useGoogleCalendar: () => ({
        calendarConfig: mockCalendarConfig,
        setupInfo: mockSetupInfo,
        calendarMethod: mockCalendarMethod,
        isLoadingConfig: ref(false),
        isLoadingSetup: ref(false),
        loading: ref(false),
        error: ref(null),
        configError: ref(null),
        setupError: ref(null),
        saveCalendarConfig: mockSaveCalendarConfig,
        testConnection: mockTestConnection,
        isSavingConfig: ref(false),
        isTestingConnection: ref(false),
        refetchConfig: vi.fn(),
        refetchSetup: vi.fn(),
        invalidateCalendar: vi.fn()
    })
}))

vi.mock('../composables/useOAuth', () => ({
    useOAuth: () => ({
        loading: ref(false),
        error: ref(null),
        connecting: ref(false),
        disconnecting: ref(false),
        oauthStatus: ref({ available: false, connected: false }),
        isConnected: ref(false),
        checkStatus: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        clearError: vi.fn(),
        formatScopes: vi.fn()
    })
}))

vi.mock('../composables/useFormFeedback', () => ({
    useFormFeedback: () => ({
        showSuccess: vi.fn(),
        showError: vi.fn(),
        handleError: vi.fn()
    })
}))

describe('GoogleCalendarSettings', () => {
    let pinia

    beforeEach(() => {
        vi.clearAllMocks()

        pinia = createPinia()
        setActivePinia(pinia)

        const userStore = useUserStore()
        userStore.user = { id: 1, name: 'Instructor', role: 'instructor' }
        userStore.token = 'test-token'
        userStore.isAuthenticated = true

        mockSetupInfo.value = null
        mockCalendarConfig.value = null
    })

    const mountComponent = () => {
        return mount(GoogleCalendarSettings, {
            props: { instructorId: 1 },
            global: {
                plugins: [pinia],
            }
        })
    }

    describe('Disabled method', () => {
        it('should show disabled message when method is disabled', () => {
            mockSetupInfo.value = {
                method: 'disabled',
                connection: { available: false, connected: false, connectedAt: null, message: 'Disabled.' }
            }
            const wrapper = mountComponent()

            expect(wrapper.text()).toContain('Calendar integration is not currently enabled')
            expect(wrapper.text()).toContain('contact your administrator')
        })

        it('should show disabled message when no setup info available', () => {
            mockSetupInfo.value = null
            const wrapper = mountComponent()

            expect(wrapper.text()).toContain('Calendar integration is not currently enabled')
        })
    })

    describe('OAuth method', () => {
        it('should show connect button when not connected', () => {
            mockSetupInfo.value = {
                method: 'oauth',
                connection: { available: true, connected: false, connectedAt: null, message: 'Connect your Google Calendar.' }
            }
            const wrapper = mountComponent()

            expect(wrapper.text()).toContain('Google Calendar Integration')
            expect(wrapper.text()).toContain('Connect with Google')
        })

        it('should show connection status when connected', () => {
            mockSetupInfo.value = {
                method: 'oauth',
                connection: { available: true, connected: true, connectedAt: '2026-01-15T10:00:00Z', message: 'Connected.' },
                scopes: 'https://www.googleapis.com/auth/calendar'
            }
            const wrapper = mountComponent()

            expect(wrapper.text()).toContain('Connected')
            expect(wrapper.text()).toContain('Jan 15, 2026')
            expect(wrapper.text()).toContain('Calendar')
            expect(wrapper.text()).toContain('Disconnect')
            expect(wrapper.text()).toContain('Test Connection')
        })

        it('should show all-day event handling when connected', () => {
            mockSetupInfo.value = {
                method: 'oauth',
                connection: { available: true, connected: true, connectedAt: '2026-01-15T10:00:00Z', message: 'Connected.' }
            }
            mockCalendarConfig.value = { config: { calendar_id: 'test@gmail.com', all_day_event_handling: 'block' } }
            const wrapper = mountComponent()

            expect(wrapper.text()).toContain('All-day Event Handling')
            expect(wrapper.text()).toContain('Save Settings')
        })

        it('should disable connect button when OAuth unavailable', () => {
            mockSetupInfo.value = {
                method: 'oauth',
                connection: { available: false, connected: false, connectedAt: null, message: 'OAuth not configured on server.' }
            }
            const wrapper = mountComponent()

            expect(wrapper.text()).toContain('OAuth not configured on server')
            const connectBtn = wrapper.findAll('button').find(b => b.text().includes('Connect with Google'))
            expect(connectBtn?.attributes('disabled')).toBeDefined()
        })
    })

    describe('Service Account method', () => {
        it('should show calendar ID input when available', () => {
            mockSetupInfo.value = {
                method: 'service_account',
                connection: { available: true, connected: false, connectedAt: null, message: 'Share your calendar.' },
                serviceAccountEmail: 'test@project.iam.gserviceaccount.com'
            }
            const wrapper = mountComponent()

            expect(wrapper.text()).toContain('Google Calendar Integration')
            expect(wrapper.text()).toContain('Calendar ID')
            expect(wrapper.find('input').exists()).toBe(true)
        })

        it('should show setup instructions when not connected', () => {
            mockSetupInfo.value = {
                method: 'service_account',
                connection: { available: true, connected: false, connectedAt: null, message: 'Share your calendar.' },
                serviceAccountEmail: 'test@project.iam.gserviceaccount.com'
            }
            const wrapper = mountComponent()

            expect(wrapper.text()).toContain('Setup Instructions')
            expect(wrapper.text()).toContain('test@project.iam.gserviceaccount.com')
            expect(wrapper.text()).toContain('Share with specific people')
        })

        it('should show test button and all-day handling when connected', () => {
            mockSetupInfo.value = {
                method: 'service_account',
                connection: { available: true, connected: true, connectedAt: '2026-02-01T12:00:00Z', message: 'Connected.' },
                serviceAccountEmail: 'test@project.iam.gserviceaccount.com'
            }
            mockCalendarConfig.value = { config: { calendar_id: 'test@gmail.com', all_day_event_handling: 'ignore' } }
            const wrapper = mountComponent()

            expect(wrapper.text()).toContain('Connected')
            expect(wrapper.text()).toContain('Test Connection')
            expect(wrapper.text()).toContain('All-day Event Handling')
        })

        it('should show unavailable message when service account not configured', () => {
            mockSetupInfo.value = {
                method: 'service_account',
                connection: { available: false, connected: false, connectedAt: null, message: 'Service account not configured. Please contact your administrator.' },
                serviceAccountEmail: null
            }
            const wrapper = mountComponent()

            expect(wrapper.text()).toContain('Service account not configured')
            expect(wrapper.find('input').exists()).toBe(false)
        })

        it('should disable save button when calendar ID is empty', () => {
            mockSetupInfo.value = {
                method: 'service_account',
                connection: { available: true, connected: false, connectedAt: null, message: 'Share your calendar.' },
                serviceAccountEmail: 'test@project.iam.gserviceaccount.com'
            }
            const wrapper = mountComponent()

            const saveBtn = wrapper.findAll('button').find(b => b.text().includes('Save'))
            expect(saveBtn?.attributes('disabled')).toBeDefined()
        })
    })

    describe('No method overlap', () => {
        it('should not show service account UI when method is oauth', () => {
            mockSetupInfo.value = {
                method: 'oauth',
                connection: { available: true, connected: false, connectedAt: null, message: 'Connect.' }
            }
            const wrapper = mountComponent()

            expect(wrapper.text()).not.toContain('Calendar ID')
            expect(wrapper.text()).not.toContain('Setup Instructions')
        })

        it('should not show OAuth UI when method is service_account', () => {
            mockSetupInfo.value = {
                method: 'service_account',
                connection: { available: true, connected: false, connectedAt: null, message: 'Share.' },
                serviceAccountEmail: 'test@project.iam.gserviceaccount.com'
            }
            const wrapper = mountComponent()

            expect(wrapper.text()).not.toContain('Connect with Google')
        })
    })
})
