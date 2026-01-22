<script setup>
import { DialogRoot } from 'radix-vue'

defineProps({
  open: Boolean,
  defaultOpen: Boolean,
  modal: { type: Boolean, default: true }
})

const emit = defineEmits(['update:open'])
</script>

<template>
  <DialogRoot 
    :open="open" 
    :default-open="defaultOpen"
    :modal="modal"
    @update:open="emit('update:open', $event)"
  >
    <slot />
  </DialogRoot>
</template>
