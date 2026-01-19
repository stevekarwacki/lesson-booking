# Toast Notifications System

## Overview

The application uses [Vue Toastification](https://github.com/Maronato/vue-toastification) for user feedback notifications. This provides a consistent, accessible way to show success, error, warning, and info messages throughout the app.

## Installation

```bash
npm install vue-toastification@next
```

## Configuration

Toast configuration is centralized in `/frontend/src/config/toast.js`:

```javascript
export const toastOptions = {
  position: 'top-right',
  timeout: 4000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false,
  transition: 'Vue-Toastification__bounce',
  maxToasts: 5,
  newestOnTop: true,
  toastClassName: 'custom-toast-container'
}
```

The toast system is initialized in `/frontend/src/main.js`.

### Z-Index Configuration

Toasts are configured to appear above modal overlays:
- **Modals**: `z-index: 10000` (defined in `--z-index-modal` CSS variable)
- **Toasts**: `z-index: 10100` (set in `/frontend/src/styles/components/toast.css`)

This ensures toast notifications are always visible, even when modals are open.

### Custom Styling

Library-specific customizations are located in `/frontend/src/styles/components/toast.css`. This includes:
- Z-index overrides for modal compatibility
- Space for future theme-specific customizations (colors, animations, etc.)

## Usage

### Recommended: Using the Form Feedback Composable

For consistent user feedback across the app, use the `useFormFeedback` composable:

```vue
<script setup>
import { useFormFeedback } from '@/composables/useFormFeedback'

const { showSuccess, showError, showWarning, showInfo, handleError } = useFormFeedback()

const handleSubmit = async () => {
  try {
    await someApiCall()
    showSuccess('Saved successfully!')
  } catch (error) {
    handleError(error, 'Failed to save: ')
  }
}
</script>
```

#### Form Feedback API

- `showSuccess(message, options?)` - Show success message
- `showError(error, options?)` - Show error (accepts Error object or string)
- `showWarning(message, options?)` - Show warning message
- `showInfo(message, options?)` - Show info message
- `handleError(error, prefix?)` - Handle caught exceptions with optional prefix
- `showValidationErrors(validationErrors)` - Show form validation errors

### Direct Toast API (Advanced)

For advanced use cases, you can use the toast API directly:

```vue
<script setup>
import { useToast } from 'vue-toastification'

const toast = useToast()

const handleSubmit = async () => {
  try {
    await someApiCall()
    toast.success('Saved successfully!')
  } catch (error) {
    toast.error(`Failed to save: ${error.message}`)
  }
}
</script>
```

## Current Implementations

### Authentication
- **Login Success**: "Login successful!"
- **Login Error**: "Invalid email or password" / "All fields are required"
- **Signup Success**: "Account created successfully!"
- **Signup Error**: "Passwords do not match" / validation errors

### User Management (Admin)
- **Create User Success**: "User created successfully"
- **Create User Error**: "Error creating user: [error message]"
- **Update User Success**: "User updated successfully"
- **Update User Error**: "Error updating user: [error message]"

### Settings (Admin)
- **Save Settings Success**: "[Section] updated successfully"
- **Save Settings Error**: "Error saving settings: [error message]"

### Booking Management
- **New Booking Success**: "Lesson booked successfully!"
- **New Booking Error**: "Failed to book lesson" / validation errors
- **Reschedule Success**: "Booking rescheduled successfully!"
- **Reschedule Error**: "Failed to reschedule: [error message]"
- **Cancel Success**: "Booking cancelled successfully!"
- **Cancel Error**: "Failed to cancel booking: [error message]"

### Attendance Tracking (Instructor)
- **Mark Attendance Success**: "Attendance marked as [status]"
- **Mark Attendance Error**: "Failed to update attendance: [error message]"

### Profile Management
- **Update Success**: "Profile updated successfully"
- **Update Error**: Validation errors / "An error occurred while updating your profile"
- **Password Validation Error**: Various password strength/match errors

### Payments
- **Payment Success**: "Payment processed successfully!"
- **Subscription Success**: "Subscription activated successfully!"
- **Payment Error**: "[error message]"

### Google Calendar Integration
- **Save Settings Success**: "Calendar settings saved successfully!"
- **Save Settings Error**: "Failed to save calendar settings: [error message]"
- **Test Connection Success**: "Connection successful! Found [X] events for today." or "Calendar connection test successful!"
- **Test Connection Error**: "[error message]" or "Calendar connection test failed"
- **OAuth Disconnect Success**: "Google account disconnected successfully!"
- **OAuth Disconnect Error**: "Failed to disconnect OAuth: [error message]"

## Best Practices

1. **Keep messages concise**: Toast messages should be short and actionable
2. **Use appropriate types**: 
   - `success` for completed actions
   - `error` for failures
   - `warning` for cautions
   - `info` for neutral information
3. **Include context in errors**: Show the actual error message when available
4. **Don't overuse**: Only show toasts for significant user actions
5. **Pair with navigation**: After success toasts, navigate users to see the results

## Accessibility

Vue Toastification includes built-in ARIA attributes for screen reader support:
- Toasts are announced to screen readers
- Keyboard navigation is supported
- Focus management is handled automatically

## Customization

To modify toast behavior globally, update `/frontend/src/config/toast.js`.

To customize a specific toast:

```javascript
toast.success('Custom message', {
  timeout: 2000,
  position: 'bottom-center',
  hideProgressBar: true
})
```

## Testing

The `useFormFeedback` composable has comprehensive unit tests in `/frontend/src/tests/useFormFeedback.test.js`.

### Testing Components with Toast Notifications

When testing components that use toast notifications, mock the `useFormFeedback` composable:

```javascript
import { vi } from 'vitest'

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/composables/useFormFeedback', () => ({
  useFormFeedback: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    handleError: vi.fn(),
    showValidationErrors: vi.fn()
  })
}))

// In your test
expect(mockShowSuccess).toHaveBeenCalledWith('Expected message')
```

## Related Documentation

- [Form Feedback Composable Tests](../frontend/src/tests/useFormFeedback.test.js)
- [Rescheduling UX Tests](../frontend/src/tests/rescheduling-ux.test.js)
- [Vue Toastification Docs](https://vue-toastification.maronato.dev/)

