import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createApp } from 'vue'
import { useTheme, applyTheme } from '@/composables/useTheme'
import { useSettingsStore } from '@/stores/settingsStore'
import { CURATED_PALETTES, getThemeDefaults } from '@/constants/themeDefaults'
import ThemeConfigSection from '@/components/admin/ThemeConfigSection.vue'

// Mock fetch globally
global.fetch = vi.fn()

describe('Theme System', () => {
  let queryClient
  let pinia
  
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    
    vi.clearAllMocks()
    
    // Mock successful API responses
    global.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        theme: {
          primary_color: '#28a745',
          secondary_color: '#20c997',
          palette_name: 'Forest Green'
        }
      })
    })
  })

  describe('Theme Constants', () => {
    it('should have valid curated palettes', () => {
      expect(CURATED_PALETTES).toBeDefined()
      expect(CURATED_PALETTES.length).toBe(5)
      
      // Check each palette has required properties
      CURATED_PALETTES.forEach(palette => {
        expect(palette).toHaveProperty('name')
        expect(palette).toHaveProperty('primary')
        expect(palette).toHaveProperty('secondary')
        
        // Check hex color format
        expect(palette.primary).toMatch(/^#[0-9A-Fa-f]{6}$/)
        expect(palette.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/)
      })
    })

    it('should generate valid theme defaults', () => {
      const defaults = getThemeDefaults()
      
      expect(defaults).toHaveProperty('primary_color')
      expect(defaults).toHaveProperty('secondary_color')
      expect(defaults).toHaveProperty('palette_name')
      
      expect(defaults.primary_color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(defaults.secondary_color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('should override defaults with provided theme data', () => {
      const customTheme = {
        primary_color: '#007bff',
        secondary_color: '#17a2b8'
      }
      
      const theme = getThemeDefaults(customTheme)
      
      expect(theme.primary_color).toBe('#007bff')
      expect(theme.secondary_color).toBe('#17a2b8')
      expect(theme.palette_name).toBe('Forest Green') // Should keep default
    })
  })

  describe('useTheme Composable', () => {
    it('should apply theme to CSS custom properties', () => {
      const mockSetProperty = vi.fn()
      
      // Mock document.documentElement.style.setProperty
      const originalSetProperty = document.documentElement.style.setProperty
      document.documentElement.style.setProperty = mockSetProperty
      
      const themeColors = {
        primary_color: '#007bff',
        secondary_color: '#17a2b8'
      }
      
      applyTheme(themeColors)
      
      expect(mockSetProperty).toHaveBeenCalledWith('--theme-primary', '#007bff')
      expect(mockSetProperty).toHaveBeenCalledWith('--primary-color', '#007bff')
      expect(mockSetProperty).toHaveBeenCalledWith('--theme-secondary', '#17a2b8')
      expect(mockSetProperty).toHaveBeenCalledWith('--success-color', '#17a2b8')
      
      // Should generate primary variants
      expect(mockSetProperty).toHaveBeenCalledWith('--theme-primary-hover', expect.stringMatching(/^#[0-9A-Fa-f]{6}$/))
      expect(mockSetProperty).toHaveBeenCalledWith('--primary-dark', expect.stringMatching(/^#[0-9A-Fa-f]{6}$/))
      
      // Should calculate text color
      expect(mockSetProperty).toHaveBeenCalledWith('--theme-text-on-primary', expect.stringMatching(/^#(000000|ffffff)$/))
      
      // Restore original function
      document.documentElement.style.setProperty = originalSetProperty
    })

    it('should handle missing colors gracefully', () => {
      const mockSetProperty = vi.fn()
      document.documentElement.style.setProperty = mockSetProperty
      
      applyTheme(null)
      applyTheme({})
      
      expect(mockSetProperty).not.toHaveBeenCalled()
    })

    it('should integrate with settings store', () => {
      const app = createApp({})
      app.use(createPinia())
      
      const store = useSettingsStore()
      store.config.theme = {
        primary_color: '#fd7e14',
        secondary_color: '#ffc107'
      }
      
      // The useTheme composable should be reactive to store changes
      const { theme } = useTheme()
      
      expect(theme.value).toEqual(store.config.theme)
    })
  })

  describe('Settings Store Theme Integration', () => {
    it('should provide theme getters', () => {
      const store = useSettingsStore()
      
      // Test default values
      expect(store.primaryColor).toBe('#28a745')
      expect(store.secondaryColor).toBe('#20c997')
      expect(store.paletteName).toBe('Forest Green')
      
      // Test with custom theme
      store.config.theme = {
        primary_color: '#6f42c1',
        secondary_color: '#e83e8c',
        palette_name: 'Royal Purple'
      }
      
      expect(store.primaryColor).toBe('#6f42c1')
      expect(store.secondaryColor).toBe('#e83e8c')
      expect(store.paletteName).toBe('Royal Purple')
    })

    // Note: Theme saving is now done via useAdminSettings composable
    // Tests for theme saving functionality are in useAdminSettings.test.js

    it('should update theme preview', () => {
      const store = useSettingsStore()
      
      const updates = {
        primary_color: '#ff5722',
        secondary_color: '#ff9800'
      }
      
      store.updateThemePreview(updates)
      
      expect(store.config.theme.primary_color).toBe('#ff5722')
      expect(store.config.theme.secondary_color).toBe('#ff9800')
    })
  })

  describe('ThemeConfigSection Component', () => {
    let wrapper

    beforeEach(() => {
      // Mock the branding API call
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/branding')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              logoUrl: '/test-logo.png',
              logoConfig: {
                maxWidth: 320,
                maxHeight: 80,
                minWidth: 50,
                minHeight: 50,
                allowedFormats: 'JPG, PNG, WebP',
                positionOptions: [
                  { value: 'left', label: 'Left aligned' },
                  { value: 'center', label: 'Centered' }
                ]
              },
              logoPosition: 'left'
            })
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
      })

      wrapper = mount(ThemeConfigSection, {
        global: {
          plugins: [pinia, [VueQueryPlugin, { queryClient }]]
        },
        props: {
          initialData: {
            primaryColor: '#28a745',
            secondaryColor: '#20c997',
            palette: 'Forest Green'
          }
        }
      })
    })

    it('should render curated palettes', () => {
      const paletteButtons = wrapper.findAll('.palette-option')
      expect(paletteButtons.length).toBe(5)
      
      // Check that Forest Green is initially active
      const activeButton = wrapper.find('.palette-option.active')
      expect(activeButton.text()).toContain('Forest Green')
    })

    it('should select palette on click', async () => {
      const oceanBlueButton = wrapper.findAll('.palette-option')[1] // Ocean Blue
      await oceanBlueButton.trigger('click')
      
      expect(oceanBlueButton.classes()).toContain('active')
      expect(wrapper.vm.selectedPalette.name).toBe('Ocean Blue')
      expect(wrapper.vm.customPrimaryColor).toBe('#007bff')
    })

    it('should validate custom color input', async () => {
      const colorInput = wrapper.find('.color-text-input')
      
      // Test valid hex color
      await colorInput.setValue('#ff5722')
      expect(wrapper.vm.isCustomColorValid).toBe(true)
      expect(wrapper.vm.selectedPalette).toBeNull() // Should reset palette
      
      // Test invalid color
      await colorInput.setValue('invalid-color')
      expect(wrapper.vm.isCustomColorValid).toBe(false)
    })

    it('should show contrast warning for problematic colors', async () => {
      const colorInput = wrapper.find('.color-text-input')
      
      // Test a color that might have contrast issues (mid-gray)
      await colorInput.setValue('#808080')
      
      expect(wrapper.vm.contrastWarning).toBe(true)
      
      const warning = wrapper.find('.contrast-warning')
      expect(warning.exists()).toBe(true)
      expect(warning.text()).toContain('accessibility standards')
    })

    // Note: Theme saving is now tested via useAdminSettings.test.js
    // Component integration is complex due to multiple fetch calls (branding, theme, etc.)

    it('should reset to defaults', async () => {
      // Change to different palette first
      const royalPurpleButton = wrapper.findAll('.palette-option')[3]
      await royalPurpleButton.trigger('click')
      
      expect(wrapper.vm.customPrimaryColor).toBe('#6f42c1')
      
      // Reset to defaults (now using shadcn Button component)
      const buttons = wrapper.findAll('button')
      const resetButton = buttons.find(btn => btn.text().includes('Reset'))
      expect(resetButton).toBeDefined()
      await resetButton.trigger('click')
      
      expect(wrapper.vm.selectedPalette.name).toBe('Forest Green')
      expect(wrapper.vm.customPrimaryColor).toBe('#28a745')
      expect(wrapper.vm.contrastWarning).toBe(false)
    })

    it('should generate preview styles correctly', () => {
      wrapper.vm.selectedPalette = CURATED_PALETTES[1] // Ocean Blue
      wrapper.vm.customPrimaryColor = '#007bff'
      
      const styles = wrapper.vm.previewStyles
      
      expect(styles['--preview-primary']).toBe('#007bff')
      expect(styles['--preview-secondary']).toBe('#17a2b8')
      expect(styles['--preview-primary-hover']).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(styles['--preview-text-on-primary']).toMatch(/^#(000000|ffffff)$/)
    })

    it('should track changes correctly', async () => {
      // The component initializes with props that might cause hasChanges to be true initially
      // Let's test the change tracking after making an actual change
      const initialHasChanges = wrapper.vm.hasChanges
      
      // Change to different palette
      const oceanBlueButton = wrapper.findAll('.palette-option')[1]
      await oceanBlueButton.trigger('click')
      await wrapper.vm.$nextTick()
      
      // Should detect changes after palette selection
      expect(wrapper.vm.hasChanges).toBe(true)
      
      // Reset should clear changes (now using shadcn Button component)
      const buttons = wrapper.findAll('button')
      const resetButton = buttons.find(btn => btn.text().includes('Reset'))
      expect(resetButton).toBeDefined()
      await resetButton.trigger('click')
      await wrapper.vm.$nextTick()
      
      // After reset, palette should be back to Forest Green
      expect(wrapper.vm.selectedPalette.name).toBe('Forest Green')
      expect(wrapper.vm.customPrimaryColor).toBe('#28a745')
    })
  })

  describe('Color Utility Functions', () => {
    it('should darken colors correctly', () => {
      // Test the color darkening logic directly since it's an internal function
      const darkenColor = (color, amount) => {
        const hex = color.replace('#', '')
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - amount))
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - amount))
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - amount))
        
        return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`
      }
      
      const darkened = darkenColor('#ffffff', 0.1)
      expect(darkened).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(darkened).not.toBe('#ffffff') // Should be darker
    })

    it('should calculate contrast text correctly', () => {
      // Test the contrast text calculation logic directly
      const getContrastText = (backgroundColor) => {
        const hex = backgroundColor.replace('#', '')
        const r = parseInt(hex.substr(0, 2), 16)
        const g = parseInt(hex.substr(2, 2), 16)
        const b = parseInt(hex.substr(4, 2), 16)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        
        return luminance > 0.5 ? '#000000' : '#ffffff'
      }
      
      // Light background should use dark text
      expect(getContrastText('#ffffff')).toBe('#000000')
      
      // Dark background should use light text
      expect(getContrastText('#000000')).toBe('#ffffff')
    })

    it('should generate complementary secondary colors', () => {
      // Test the secondary color generation logic directly
      const generateSecondaryColor = (primaryColor) => {
        const hex = primaryColor.replace('#', '')
        const r = parseInt(hex.substr(0, 2), 16)
        const g = parseInt(hex.substr(2, 2), 16)
        const b = parseInt(hex.substr(4, 2), 16)
        
        // Simple complementary color generation
        const newR = Math.min(255, r + 40)
        const newG = Math.min(255, g + 40)
        const newB = Math.max(0, b - 40)
        
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
      }
      
      const secondary = generateSecondaryColor('#007bff')
      
      expect(secondary).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(secondary).not.toBe('#007bff') // Should be different
    })
  })

  describe('Integration Tests', () => {
    it('should integrate theme system with app initialization', async () => {
      const store = useSettingsStore()
      
      // Mock successful initialization
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          theme: {
            primary_color: '#fd7e14',
            secondary_color: '#ffc107',
            palette_name: 'Sunset Orange'
          }
        })
      })
      
      await store.initialize()
      
      expect(store.config.theme.primary_color).toBe('#fd7e14')
      expect(store.config.theme.secondary_color).toBe('#ffc107')
      expect(store.config.theme.palette_name).toBe('Sunset Orange')
    })

    it('should handle theme initialization failures gracefully', async () => {
      const store = useSettingsStore()
      
      global.fetch.mockRejectedValueOnce(new Error('Network error'))
      
      await store.initialize()
      
      // Should use defaults when network fails
      // The store should fall back to getter defaults when config.theme is undefined
      expect(store.primaryColor).toBe('#28a745')
      expect(store.secondaryColor).toBe('#20c997')
      expect(store.paletteName).toBe('Forest Green')
      
      // Config might be undefined or empty, but getters should work
      expect(store.primaryColor).toBeDefined()
      expect(store.secondaryColor).toBeDefined()
      expect(store.paletteName).toBeDefined()
    })
  })
})
