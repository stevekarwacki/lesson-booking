<template>
    <SearchBar
        v-model="query"
        placeholder="Search instructors by name or email..."
        :results="filteredInstructors"
        :show-results="isOpen"
        :min-chars="1"
        @focus="isOpen = true"
        @blur="handleBlur"
        @select="handleSelect"
    >
        <template #result="{ result }">
            <div class="result-content">
                <div class="result-primary">{{ result.User?.name }}</div>
                <div class="result-secondary">{{ result.User?.email || result.email }}</div>
            </div>
        </template>
    </SearchBar>
</template>

<script setup>
import { ref, computed } from 'vue'
import SearchBar from './SearchBar.vue'

const props = defineProps({
    items: {
        type: Array,
        default: () => []
    },
    maxResults: {
        type: Number,
        default: 10
    }
})

const emit = defineEmits(['select'])

const query = ref('')
const isOpen = ref(false)

const filteredInstructors = computed(() => {
    const pool = props.items
    if (!query.value) return pool.slice(0, props.maxResults)

    const q = query.value.toLowerCase()
    return pool.filter(instr => {
        const name = (instr.User?.name || instr.name || '').toLowerCase()
        const email = (instr.User?.email || instr.email || '').toLowerCase()
        return name.includes(q) || email.includes(q)
    }).slice(0, props.maxResults)
})

const handleBlur = () => {
    // Delay to allow click on result items to fire before hiding the list
    setTimeout(() => { isOpen.value = false }, 200)
}

const handleSelect = (instructor) => {
    query.value = ''
    isOpen.value = false
    emit('select', instructor)
}
</script>
