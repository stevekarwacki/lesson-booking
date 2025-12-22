/**
 * Toast Notification Configuration
 * 
 * Centralized configuration for vue-toastification
 * Used in main.js for app-wide toast notifications
 * 
 * Note: z-index is set to 10100 to appear above modals (which use z-index: 10000)
 */

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
  // Ensure toasts appear above modals (modals use z-index: 10000)
  toastClassName: 'custom-toast-container'
}

