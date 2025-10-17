# Settings Store Pattern

## Overview

The Settings Store implements a simple, maintainable pattern for managing app-wide configuration. It follows **Option 4: App Initialization Loading** - load once on startup, store in Pinia, use everywhere.

## Architecture

### Core Principle
```
Load Once → Store in Pinia → Fast Access Everywhere
```

- **No caching complexity** - No timestamps, cache invalidation, or stale data logic
- **No loading states** - Configuration is available immediately after app startup
- **Graceful fallbacks** - App works with defaults even if API fails
- **Easy to extend** - Simple pattern for adding new configuration

## Implementation

### 1. Settings Store (`frontend/src/stores/settingsStore.js`)

```javascript
export const useSettingsStore = defineStore('settings', {
  state: () => ({
    config: {
      // Lesson settings
      defaultLessonDurationMinutes: 30,
      slotDuration: 2, // 30 minutes = 2 slots of 15 minutes each
      inPersonPaymentEnabled: false,
      
      // Add other common config here as needed
      // timezone: 'UTC',
      // maxBookingDays: 30,
    },
    isLoaded: false,
    isLoading: false
  }),

  getters: {
    slotDuration: (state) => state.config.slotDuration,
    defaultLessonDuration: (state) => state.config.defaultLessonDurationMinutes,
    inPersonPaymentEnabled: (state) => state.config.inPersonPaymentEnabled,
    isReady: (state) => state.isLoaded
  },

  actions: {
    async initialize() { /* Load from API once */ },
    async refresh() { /* Reload after admin changes */ },
    updateConfig(updates) { /* Direct updates */ }
  }
})
```

### 2. API Endpoint (`/api/admin/settings/lessons`)

```javascript
router.get('/settings/lessons', authorize('manage', 'User'), async (req, res) => {
    const lessonSettings = await AppSettings.getSettingsByCategory('lessons');
    
    const settings = {
        default_duration_minutes: parseInt(lessonSettings.default_duration_minutes) || 30,
        in_person_payment_enabled: lessonSettings.in_person_payment_enabled || 'false'
    };
    
    res.json(settings);
});
```

### 3. App Initialization (`frontend/src/main.js`)

```javascript
import { useSettingsStore } from './stores/settingsStore'

// Initialize app configuration on startup
const settingsStore = useSettingsStore()
settingsStore.initialize()

app.mount('#app')
```

## Usage Pattern

### In Components

```javascript
import { useSettingsStore } from '../stores/settingsStore'

const settingsStore = useSettingsStore()

// Fast, synchronous access - no loading states needed!
const SLOT_DURATION = settingsStore.slotDuration
const lessonDuration = settingsStore.defaultLessonDuration
```

### Before (Hardcoded)
```javascript
const SLOT_DURATION = 2 // ❌ Hardcoded magic number
for (let i = 0; i < eventDuration; i += 2) { // ❌ Hardcoded
```

### After (Configurable)
```javascript
const SLOT_DURATION = settingsStore.slotDuration // ✅ Configurable
for (let i = 0; i < eventDuration; i += settingsStore.slotDuration) { // ✅ Configurable
```

## Benefits

### 1. Performance
- **Zero API calls** after startup
- **Instant access** - no async loading in components
- **No loading states** needed throughout the app

### 2. Maintainability
- **Single source of truth** for all app configuration
- **Easy to extend** - just add new properties to config
- **No complex caching logic** to maintain

### 3. Reliability
- **Graceful fallbacks** - app works with defaults if API fails
- **No stale data issues** - configuration is fresh for entire session
- **Simple error handling** - just use defaults on failure

### 4. Developer Experience
- **Simple usage** - `settingsStore.slotDuration` everywhere
- **No async complexity** in components
- **Clear pattern** that's easy to understand and replicate

## Extending the Pattern

Adding new configuration is straightforward:

### 1. Add to State
```javascript
config: {
  slotDuration: 2,
  maxBookingDays: 30,    // ← New setting
  timezone: 'UTC',       // ← New setting
  businessHours: {       // ← Complex setting
    start: '09:00',
    end: '17:00'
  }
}
```

### 2. Add Getter
```javascript
getters: {
  maxBookingDays: (state) => state.config.maxBookingDays,
  timezone: (state) => state.config.timezone,
  businessHours: (state) => state.config.businessHours
}
```

### 3. Load in Initialize
```javascript
async initialize() {
  // Load from multiple endpoints if needed
  const [lessonSettings, businessSettings] = await Promise.all([
    fetch('/api/admin/settings/lessons'),
    fetch('/api/admin/settings/business')
  ])
  
  // Update config
  this.config.maxBookingDays = lessonData.max_booking_days || 30
  this.config.timezone = businessData.timezone || 'UTC'
}
```

## Use Cases

This pattern is ideal for:

- **Lesson configuration** - durations, pricing, restrictions
- **Business settings** - hours, timezone, contact info
- **Feature flags** - enable/disable features across the app
- **UI preferences** - themes, layouts, defaults
- **Integration settings** - API endpoints, keys (non-sensitive)

## Anti-Patterns

❌ **Don't use this pattern for:**
- **User-specific settings** (use user store instead)
- **Frequently changing data** (use regular API calls)
- **Large datasets** (use pagination/lazy loading)
- **Sensitive data** (keep server-side only)

## Testing

The settings store is designed to work seamlessly in tests:

```javascript
// In tests, you can mock the settings
const mockSettingsStore = {
  slotDuration: 2,
  defaultLessonDuration: 30,
  isReady: true
}
```

## Migration Guide

### From Hardcoded Values
1. Identify hardcoded configuration values
2. Add them to the settings store config
3. Replace hardcoded usage with `settingsStore.propertyName`
4. Add API endpoint to load the values
5. Update admin interface to modify the values

### From Complex Caching
1. Remove cache timestamps and invalidation logic
2. Simplify to single `initialize()` call
3. Remove loading states from components
4. Use direct property access instead of async getters

## Related Documentation

- [CASL Permissions Guide](./CASL_PERMISSIONS_GUIDE.md) - For user-specific permissions
- [Business Information Feature](./BUSINESS_INFORMATION_FEATURE.md) - For public business settings
- [App Settings Model](../models/AppSettings.js) - Database layer for settings
