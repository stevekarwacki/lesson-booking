# Theming System Feature

## Overview

The Theming System allows administrators to customize the visual appearance of the lesson booking application through color scheme selection and branding configuration. This Node.js/Express backend with Vue 3 frontend includes curated color palettes, custom color support, and live theme preview with accessibility validation.

**Tech Stack**: Express.js, Sequelize ORM, Vue 3, CSS Custom Properties, WCAG AA compliance

## Features

- **Curated Color Palettes**: 5 professionally designed, WCAG AA compliant color schemes
- **Custom Color Support**: Hex color input with real-time contrast validation
- **Live Theme Preview**: Instant preview of theme changes before saving
- **Accessibility Compliance**: Automatic contrast ratio checking (WCAG AA standards)
- **Global Theme Application**: CSS custom properties for consistent theming across the app
- **Theme Persistence**: Settings stored in database and applied on app initialization
- **Error Handling**: Graceful fallbacks to default themes on initialization failures
- **Responsive Design**: Theme settings interface optimized for desktop and mobile

## Architecture

### Backend Components

#### Models
- **AppSettings**: Stores theme configuration in the database
  - Category: `theme`
  - Keys: `primary_color`, `secondary_color`, `palette_name`

#### Routes
- **`/api/admin/settings/theme`** (Protected): Theme configuration endpoint
- **`/api/settings/public`** (Public): Public theme data for frontend application

#### Utilities
- **Theme validation**: Hex color format validation
- **Default fallbacks**: WCAG AA compliant default color schemes

#### Constants
- **Curated Palettes**: 5 predefined color schemes with accessibility validation

### Frontend Components

#### Admin Interface
- **`ThemeConfigSection.vue`**: Complete theme configuration UI
- **`AdminSettingsPage.vue`**: Main settings page with theme management

#### Theme System
- **`useTheme.js`**: Composable for theme application and CSS custom properties
- **`settingsStore.js`**: Pinia store for theme state management
- **`themeDefaults.js`**: Theme constants and default configurations

#### Navigation
- **Global CSS Variables**: Dynamic theme application across all components

## Configuration

### Curated Color Palettes

1. **Forest Green** (Default)
   - Primary: `#28a745`
   - Secondary: `#20c997`

2. **Ocean Blue**
   - Primary: `#007bff`
   - Secondary: `#17a2b8`

3. **Sunset Orange**
   - Primary: `#fd7e14`
   - Secondary: `#ffc107`

4. **Royal Purple**
   - Primary: `#6f42c1`
   - Secondary: `#e83e8c`

5. **Charcoal**
   - Primary: `#495057`
   - Secondary: `#6c757d`

### Custom Color Requirements

- **Format**: 6-digit hexadecimal (#RRGGBB)
- **Validation**: Automatic contrast ratio checking
- **Accessibility**: WCAG AA compliance warnings for poor contrast
- **Fallback**: Invalid colors revert to curated palette selection

## API Endpoints

### Public Endpoints

#### GET `/api/settings/public`
Returns public configuration including current theme colors, palette name, and branding information.

```json
{
  "theme": {
    "primary_color": "#28a745",
    "secondary_color": "#20c997",
    "palette_name": "Forest Green"
  },
  "business": {
    "company_name": "Lesson Booking Co"
  }
}
```

### Protected Endpoints (Admin Only)

#### PUT `/api/admin/settings/theme`
Update theme configuration. Accepts `primaryColor`, `secondaryColor`, and `palette` fields.

**Request Body:**
```json
{
  "primaryColor": "#007bff",
  "secondaryColor": "#17a2b8",
  "palette": "Ocean Blue"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Theme settings saved successfully",
  "data": {
    "primaryColor": "#007bff",
    "secondaryColor": "#17a2b8",
    "palette": "Ocean Blue"
  }
}
```

## Color System Design

### CSS Custom Properties

The theme system uses CSS custom properties for dynamic theming:

```css
:root {
  /* Core theme colors */
  --theme-primary: #28a745;
  --theme-secondary: #20c997;
  
  /* Auto-generated variants */
  --theme-primary-hover: #218838;
  --theme-primary-light: #34ce57;
  --theme-primary-dark: #1e7e34;
  
  /* Calculated text colors */
  --theme-text-on-primary: #ffffff;
  --theme-text-primary: #212529;
  --theme-text-secondary: #6c757d;
  
  /* Semantic colors */
  --primary-color: var(--theme-primary);
  --success-color: var(--theme-secondary);
  --error-color: #dc3545;
  --warning-color: #fd7e14;
  --info-color: #007bff;
}
```

### Automatic Color Generation

The system automatically generates color variants:

1. **Primary Variants**: Light (+20% brightness), Dark (-20% brightness), Hover (-10% brightness)
2. **Secondary Colors**: Auto-generated if not provided using complementary color algorithm
3. **Text Colors**: Automatically calculated for optimal contrast
4. **Semantic Mapping**: Primary color maps to success, maintains separate error/warning colors

### Accessibility Validation

#### Contrast Ratio Checking
- **Minimum Ratio**: 4.5:1 for normal text (WCAG AA)
- **Large Text**: 3:1 for text larger than 18pt or 14pt bold
- **Validation Algorithm**: Luminance-based contrast calculation
- **User Warnings**: Real-time feedback for problematic color combinations

#### Implementation
```javascript
const validateContrast = (color) => {
  const contrastWithWhite = calculateContrast(color, '#ffffff')
  const contrastWithBlack = calculateContrast(color, '#000000')
  
  return {
    isValid: contrastWithWhite >= 4.5 || contrastWithBlack >= 4.5,
    contrastRatio: Math.max(contrastWithWhite, contrastWithBlack),
    recommendedTextColor: contrastWithWhite > contrastWithBlack ? '#ffffff' : '#000000'
  }
}
```

## Theme Application Flow

### 1. Admin Configuration
1. Admin navigates to Settings → Theme & Branding
2. Selects curated palette OR enters custom hex color
3. Live preview updates immediately
4. Contrast validation provides accessibility feedback
5. Admin saves changes via "Save Changes" button

### 2. Frontend Application
1. App initialization fetches public settings
2. `useTheme` composable applies CSS custom properties
3. All components inherit theme colors through CSS variables
4. Theme persists across page refreshes and user sessions

### 3. Error Handling
1. Invalid colors fall back to default Forest Green palette
2. Network failures during initialization use hardcoded defaults
3. Missing theme data triggers automatic default application

## User Interface

### Admin Theme Configuration

#### Curated Palette Selection
- **Grid Layout**: 5 palette options displayed as color swatches
- **Active State**: Currently selected palette highlighted
- **Click to Select**: Single click applies palette immediately
- **Preview Integration**: Selection updates live preview instantly

#### Custom Color Input
- **Dual Input**: Color picker + text input for hex values
- **Format Validation**: Real-time hex color format checking
- **Contrast Warning**: Visual warning for accessibility issues
- **Palette Reset**: Custom color clears palette selection

#### Live Preview
- **Mock Interface**: Preview header with logo, buttons, and text
- **Real-time Updates**: Changes apply immediately to preview
- **Responsive Design**: Preview adapts to different screen sizes
- **Color Validation**: Preview reflects accessibility warnings

### Theme Integration

#### Component Usage
```vue
<template>
  <button class="primary-button">
    Primary Action
  </button>
</template>

<style scoped>
.primary-button {
  background-color: var(--theme-primary);
  color: var(--theme-text-on-primary);
  border: 1px solid var(--theme-primary-dark);
}

.primary-button:hover {
  background-color: var(--theme-primary-hover);
}
</style>
```

## File Structure

```
├── backend/
│   ├── constants/
│   │   └── themeDefaults.js           # Default theme configuration
│   ├── models/
│   │   └── AppSettings.js             # Settings storage
│   ├── routes/
│   │   ├── admin.js                   # Theme management endpoints
│   │   └── public.js                  # Public settings API
│   └── tests/
│       └── theme-settings.test.js     # Backend theme tests
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── admin/
    │   │       └── ThemeConfigSection.vue  # Theme configuration UI
    │   ├── composables/
    │   │   └── useTheme.js             # Theme application logic
    │   ├── constants/
    │   │   └── themeDefaults.js        # Frontend theme constants
    │   ├── stores/
    │   │   └── settingsStore.js        # Theme state management
    │   └── tests/
    │       └── theme-system.test.js    # Frontend theme tests
```

## Database Schema

Theme settings are stored in the `app_settings` table with category `theme`:

- `primary_color`: Hex color code for primary theme color
- `secondary_color`: Hex color code for secondary/accent color  
- `palette_name`: Name of selected curated palette or "custom"

**AppSettings Model**: Uses flexible key-value settings system with categorization, user tracking, and timestamps.

## State Management

### Settings Store (Pinia)

#### Theme Getters
```javascript
// Computed getters with defaults
const primaryColor = computed(() => 
  config.value.theme?.primary_color || '#28a745'
)

const secondaryColor = computed(() => 
  config.value.theme?.secondary_color || '#20c997'
)

const paletteName = computed(() => 
  config.value.theme?.palette_name || 'Forest Green'
)
```

#### Theme Actions
```javascript
// Save theme settings to backend
async saveThemeSettings(themeData) {
  const response = await fetch('/api/admin/settings/theme', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(themeData)
  })
  
  if (response.ok) {
    // Update local state
    this.updateThemePreview(themeData)
    // Apply to CSS immediately
    applyTheme(this.config.theme)
  }
}

// Live preview updates (without saving)
updateThemePreview(updates) {
  if (!this.config.theme) this.config.theme = {}
  Object.assign(this.config.theme, updates)
}
```

## Testing

### Backend Tests (15 tests)
- **Theme Settings Validation**: Hex color format, palette validation
- **API Endpoints**: Theme save/retrieve, error handling
- **Database Integration**: Settings persistence and retrieval
- **Default Handling**: Fallback behavior for missing settings
- **Public API**: Theme data exposure for frontend

### Frontend Tests (23 tests)
- **Theme Constants**: Curated palette validation, default generation
- **useTheme Composable**: CSS property application, store integration
- **Settings Store**: Theme getters, save actions, preview updates
- **ThemeConfigSection Component**: UI interactions, validation, save handling
- **Color Utilities**: Contrast calculation, color manipulation
- **Integration Tests**: App initialization, error scenarios

### Test Coverage Areas
- **Color Validation**: Hex format, contrast ratios, accessibility compliance
- **User Interactions**: Palette selection, custom color input, save actions
- **Error Handling**: Invalid colors, network failures, malformed data
- **State Management**: Store updates, preview functionality, persistence
- **CSS Application**: Custom property setting, theme inheritance

## Performance Considerations

### Optimization Strategies
- **CSS Custom Properties**: Native browser support for efficient theme switching
- **Computed Properties**: Reactive theme getters with automatic caching
- **Live Preview**: Client-side only updates until save action
- **Minimal DOM Updates**: CSS variables minimize re-rendering requirements

### Monitoring Metrics
- **Theme Switch Time**: Time from selection to visual update
- **Save Success Rate**: Theme persistence reliability
- **Color Validation Performance**: Contrast calculation efficiency
- **Component Re-render**: Impact of theme changes on component updates

## Error Handling

### Common Errors

#### Color Validation Errors
- **Invalid hex format**: "Color must be in #RRGGBB format"
- **Contrast warning**: "This color may not meet accessibility standards"
- **Missing required field**: "Primary color is required"

#### Save Errors
- **Network failure**: "Unable to save theme settings. Please try again."
- **Invalid data**: "Theme data contains invalid values"
- **Database error**: "Failed to update theme settings"

#### Initialization Errors
- **Settings load failure**: Falls back to default Forest Green theme
- **Malformed data**: Validates and sanitizes before application
- **Missing theme**: Auto-generates from curated palette defaults

### Error Recovery
1. **Input Validation**: Real-time feedback prevents invalid submissions
2. **Graceful Degradation**: Invalid colors revert to last valid state
3. **Default Fallbacks**: System always has working theme available
4. **User Feedback**: Clear error messages with suggested solutions

## Accessibility Features

### WCAG AA Compliance
- **Contrast Ratios**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Color Independence**: Information not conveyed by color alone
- **Keyboard Navigation**: Full keyboard support for theme interface
- **Screen Reader Support**: Proper ARIA labels and semantic markup

### Validation Features
- **Real-time Checking**: Immediate feedback on contrast issues
- **Visual Warnings**: Clear indicators for accessibility problems
- **Recommended Colors**: Suggestions for better contrast alternatives
- **Curated Safety**: All default palettes pre-validated for compliance

## Usage Guide

### For Administrators

1. **Select Curated Palette**:
   - Navigate to Admin Settings → Theme & Branding
   - Click desired palette from the grid
   - Review live preview
   - Click "Save Changes"

2. **Use Custom Colors**:
   - Click color picker or enter hex code in text field
   - Review contrast warning if displayed
   - Verify appearance in live preview
   - Save when satisfied

3. **Reset to Defaults**:
   - Click "Reset to Defaults" button
   - Confirms return to Forest Green palette
   - No save required - takes effect immediately

### For Developers

#### Theme Integration
```javascript
// In Vue components
<style>
.my-component {
  background: var(--theme-primary);
  color: var(--theme-text-on-primary);
  border: 1px solid var(--theme-primary-dark);
}
</style>

// In composables
import { useTheme } from '@/composables/useTheme'

const { theme, applyTheme } = useTheme()
// theme.value contains current theme colors
```

#### Custom Theme Application
```javascript
// Apply theme programmatically
applyTheme({
  primary_color: '#custom-color',
  secondary_color: '#another-color'
})
```

## Troubleshooting

### Common Issues

1. **Theme not applying**:
   - Check browser console for CSS custom property support
   - Verify theme data loaded in settings store
   - Confirm CSS variables properly referenced in stylesheets
   - Clear browser cache and refresh

2. **Colors not saving**:
   - Verify admin authentication token
   - Check network connectivity
   - Validate hex color format (#RRGGBB)
   - Review server logs for database errors

3. **Contrast warnings**:
   - Use color contrast analyzer tools
   - Select from curated palettes for guaranteed compliance
   - Adjust color lightness/darkness for better contrast
   - Consider user accessibility needs

4. **Live preview not updating**:
   - Check Vue reactivity in ThemeConfigSection component
   - Verify CSS custom property updates in browser dev tools
   - Confirm preview styles computed property updating
   - Clear component state and reinitialize

5. **Default theme not loading**:
   - Check network request to `/api/settings/public`
   - Verify settings store initialization
   - Confirm theme defaults in constants file
   - Review browser console for JavaScript errors

### Debug Information
- **Theme Store State**: Use Vue DevTools to inspect current theme values
- **CSS Variables**: Browser DevTools shows applied custom property values
- **Network Requests**: Monitor API calls for theme save/load operations
- **Console Errors**: JavaScript errors may prevent theme application

## Future Enhancements

### Planned Features
- **Dark Mode Support**: Automatic dark/light theme switching
- **Theme Templates**: Pre-built theme collections for different industries
- **Advanced Color Tools**: Color wheel, palette generator, gradient support
- **Theme Scheduling**: Automatic theme changes based on time/season
- **User Preferences**: Per-user theme selection (not just admin global)
- **Theme Export/Import**: Backup and restore theme configurations

### Technical Improvements
- **Color Spaces**: Support for HSL, RGB, and other color formats
- **Animation**: Smooth transitions between theme changes
- **Performance**: Optimize CSS custom property updates
- **Bundle Size**: Minimize theme-related JavaScript payload
- **Browser Support**: Enhanced fallbacks for older browsers

### Integration Opportunities
- **Email Templates**: Apply theme colors to email communications
- **PDF Generation**: Theme-aware document generation
- **Mobile Apps**: Sync theme to mobile applications
- **Third-party Tools**: Theme integration with external services

## Security Considerations

### Input Validation
- **Hex Color Format**: Strict validation prevents code injection
- **Data Sanitization**: All theme inputs sanitized before storage
- **SQL Injection Prevention**: Parameterized queries for database operations
- **XSS Protection**: Theme data properly escaped in templates

### Access Control
- **Admin Only**: Theme configuration restricted to admin users
- **Authentication**: JWT token validation for all theme API endpoints
- **CSRF Protection**: Cross-site request forgery prevention
- **Rate Limiting**: Prevent abuse of theme save endpoints

### Data Protection
- **No Sensitive Data**: Theme settings contain no personal information
- **Audit Trail**: Track theme changes with user attribution
- **Backup Strategy**: Regular backups of theme configurations
- **Recovery Plan**: Rollback procedures for theme corruption
