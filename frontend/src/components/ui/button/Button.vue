<script setup>
import { computed } from 'vue'
import { Primitive } from 'radix-vue'
import { buttonVariants } from './index'
import { cn } from '@/lib/utils'

const props = defineProps({
  variant: {
    type: String,
    default: 'default'
  },
  size: {
    type: String,
    default: 'default'
  },
  class: {
    type: String,
    default: ''
  },
  asChild: {
    type: Boolean,
    default: false
  }
})

const buttonClass = computed(() => {
  return cn(
    buttonVariants({ variant: props.variant, size: props.size }),
    props.class
  )
})
</script>

<template>
  <Primitive
    :as="asChild ? 'slot' : 'button'"
    :class="buttonClass"
  >
    <slot />
  </Primitive>
</template>
