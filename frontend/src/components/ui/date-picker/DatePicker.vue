<script setup>
import { ref, computed } from 'vue'
import { CalendarIcon } from 'lucide-vue-next'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CalendarDate, parseDate, getLocalTimeZone } from '@internationalized/date'

const props = defineProps({
  modelValue: String, // ISO date string (YYYY-MM-DD)
  placeholder: {
    type: String,
    default: 'Pick a date'
  },
  minValue: String, // ISO date string
  maxValue: String, // ISO date string
  disabled: Boolean,
  class: String
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)

// Convert ISO string to CalendarDate object
const calendarValue = computed({
  get: () => {
    if (!props.modelValue) return undefined
    try {
      return parseDate(props.modelValue)
    } catch {
      return undefined
    }
  },
  set: (value) => {
    if (value) {
      emit('update:modelValue', value.toString())
      // Close on next tick after the selection completes
      setTimeout(() => {
        isOpen.value = false
      }, 0)
    }
  }
})

const minCalendarValue = computed(() => {
  if (!props.minValue) return undefined
  try {
    return parseDate(props.minValue)
  } catch {
    return undefined
  }
})

const maxCalendarValue = computed(() => {
  if (!props.maxValue) return undefined
  try {
    return parseDate(props.maxValue)
  } catch {
    return undefined
  }
})

// Format the display text
const displayValue = computed(() => {
  if (!calendarValue.value) return props.placeholder
  const date = new Date(props.modelValue)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
})
</script>

<template>
  <Popover v-model:open="isOpen" :key="`date-picker-${modelValue}`">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="cn(
          'w-full justify-start text-left font-normal',
          !modelValue && 'text-muted-foreground',
          props.class
        )"
        :disabled="disabled"
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        {{ displayValue }}
      </Button>
    </PopoverTrigger>
    <PopoverContent 
      v-if="isOpen"
      class="w-auto p-0 pointer-events-auto" 
      align="start"
      :trap-focus="false"
      :disable-outside-pointer-events="false"
      @escape-key-down="isOpen = false"
    >
      <Calendar
        v-model="calendarValue"
        :min-value="minCalendarValue"
        :max-value="maxCalendarValue"
        initial-focus
      />
    </PopoverContent>
  </Popover>
</template>
