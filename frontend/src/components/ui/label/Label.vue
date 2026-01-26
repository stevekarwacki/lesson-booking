<script setup>
import { Label as RadixLabel } from 'radix-vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  class: String,
  for: String
})
</script>

<template>
  <RadixLabel
    :for="for"
    :class="cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      props.class
    )"
  >
    <slot />
  </RadixLabel>
</template>
