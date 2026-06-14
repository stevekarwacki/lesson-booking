<script setup>
import { cn } from '@/lib/utils'

const props = defineProps({
    class: {
        type: String,
        default: ''
    }
})
</script>

<template>
    <div :class="cn('mx-auto w-full max-w-[1200px]', props.class)">
        <slot />
    </div>
</template>
