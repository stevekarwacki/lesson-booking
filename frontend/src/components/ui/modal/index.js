import { cva } from 'class-variance-authority'

export { default as Modal } from './Modal.vue'

/**
 * Modal content variants
 * Defines size options for modal dialogs
 */
export const modalContentVariants = cva(
  'fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background p-6 shadow-lg duration-200 sm:rounded-lg max-h-[90vh] overflow-y-auto',
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        default: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[95vw]'
      }
    },
    defaultVariants: {
      size: 'default'
    }
  }
)
