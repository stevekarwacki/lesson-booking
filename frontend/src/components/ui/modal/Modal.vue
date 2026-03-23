<script setup>
import { computed, provide, ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const props = defineProps({
  open: Boolean,
  title: String,
  description: String,
  size: {
    type: String,
    default: 'default',
    validator: (v) => ['sm', 'md', 'default', 'lg', 'xl', 'full'].includes(v)
  },
  // Button configuration
  saveText: {
    type: String,
    default: 'Save'
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  },
  saveVariant: {
    type: String,
    default: 'default'
  },
  hideSave: Boolean,
  hideCancel: Boolean,
  saveDisabled: Boolean,
  saveLoading: Boolean,
  // Layout options
  customFooter: Boolean,
  hideHeader: Boolean
})

const emit = defineEmits(['update:open', 'save', 'cancel', 'close'])

// Internal state for child components to control
const internalSaveDisabled = ref(props.saveDisabled)
const internalSaveText = ref(props.saveText)
const internalSaveHidden = ref(props.hideSave)
const internalSaveLoading = ref(props.saveLoading)

// Watch props to sync internal state
watch(() => props.saveDisabled, (val) => { internalSaveDisabled.value = val })
watch(() => props.saveText, (val) => { internalSaveText.value = val })
watch(() => props.hideSave, (val) => { internalSaveHidden.value = val })
watch(() => props.saveLoading, (val) => { internalSaveLoading.value = val })

// Provide control interface for child components
const actionControl = {
  setSaveDisabled: (disabled) => { internalSaveDisabled.value = disabled },
  setSaveText: (text) => { internalSaveText.value = text },
  setSaveLoading: (loading) => { internalSaveLoading.value = loading },
  hideSave: () => { internalSaveHidden.value = true },
  showSave: () => { internalSaveHidden.value = false },
  close: () => handleClose(),
  onSave: null // Callback for save action - set by child component
}
provide('actionControl', actionControl)

// Computed values for button state
const finalSaveDisabled = computed(() => internalSaveDisabled.value || internalSaveLoading.value)
const finalSaveText = computed(() => internalSaveLoading.value ? 'Saving...' : internalSaveText.value)
const finalSaveHidden = computed(() => internalSaveHidden.value)

// Size classes mapping
const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  default: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw]'
}

const handleClose = () => {
  emit('update:open', false)
  emit('close')
}

const handleSave = () => {
  // If child set a save callback, call it; otherwise emit event
  if (actionControl.onSave && typeof actionControl.onSave === 'function') {
    actionControl.onSave()
  } else {
    emit('save')
  }
}

const handleCancel = () => {
  emit('cancel')
  handleClose()
}
</script>

<template>
  <Dialog :open="open" @update:open="(val) => { emit('update:open', val); if (!val) emit('close'); }">
    <DialogContent :class="sizeClasses[size]">
      <!-- Header (title and description) -->
      <DialogHeader v-if="!hideHeader && (title || description || $slots.header)">
        <slot name="header">
          <DialogTitle v-if="title">{{ title }}</DialogTitle>
          <DialogDescription v-if="description">{{ description }}</DialogDescription>
        </slot>
      </DialogHeader>

      <!-- Main content -->
      <div class="modal-body">
        <slot />
      </div>

      <!-- Footer with standard buttons -->
      <DialogFooter v-if="!customFooter && (!hideCancel || !finalSaveHidden)">
        <Button 
          v-if="!hideCancel"
          variant="outline" 
          @click="handleCancel"
          :disabled="internalSaveLoading"
        >
          {{ cancelText }}
        </Button>
        <Button 
          v-if="!finalSaveHidden"
          :variant="saveVariant"
          :disabled="finalSaveDisabled"
          @click="handleSave"
        >
          {{ finalSaveText }}
        </Button>
      </DialogFooter>

      <!-- Custom footer slot -->
      <DialogFooter v-if="customFooter">
        <slot name="footer" />
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.modal-body {
  overflow-y: auto; /* Allow vertical scrolling */
  /* Explicit height constraint */
  max-height: calc(90vh - 200px);
  display: flex;
  flex-direction: column;
}

/* Override for slide transitions - they manage their own scrolling */
.modal-body:has(.edit-booking-slides) {
  overflow: hidden;
  height: calc(90vh - 200px);
}
</style>
