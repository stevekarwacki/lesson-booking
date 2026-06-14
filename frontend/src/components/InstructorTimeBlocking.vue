<template>
    <Card>
        <CardHeader>
            <CardTitle>Block Out Time</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
            <p class="timezone-note">
                Enter times in your local timezone ({{ timezoneStore.timezoneDisplayName }}).
                They will be stored correctly in UTC.
            </p>

            <form @submit.prevent="addBlockedTime" class="block-form">
                <div class="form-row">
                    <div class="form-field">
                        <Label for="block-start">Start</Label>
                        <Input
                            id="block-start"
                            type="datetime-local"
                            v-model="newBlock.startDateTime"
                            required
                        />
                    </div>
                    <div class="form-field">
                        <Label for="block-end">End</Label>
                        <Input
                            id="block-end"
                            type="datetime-local"
                            v-model="newBlock.endDateTime"
                            required
                        />
                    </div>
                    <div class="form-field form-field--reason">
                        <Label for="block-reason">Reason <span class="optional">(optional)</span></Label>
                        <Input
                            id="block-reason"
                            type="text"
                            v-model="newBlock.reason"
                            placeholder="e.g., Vacation, Personal Day"
                        />
                    </div>
                </div>
                <Button type="submit" :disabled="isCreatingBlockedSlot">
                    {{ isCreatingBlockedSlot ? 'Adding…' : 'Add Blocked Time' }}
                </Button>
            </form>

            <Separator />

            <div>
                <h4 class="list-heading">Current Blocked Times</h4>
                <p v-if="!blockedTimes.length" class="empty-state">
                    No blocked time periods set.
                </p>
                <div v-else class="block-list">
                    <div
                        v-for="block in blockedTimes"
                        :key="block.id"
                        class="block-item"
                    >
                        <div class="block-details">
                            <span class="block-dates">
                                {{ formatDateTime(block.start_datetime) }} – {{ formatDateTime(block.end_datetime) }}
                            </span>
                            <span v-if="block.reason" class="block-reason">{{ block.reason }}</span>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            :disabled="isDeletingBlockedSlot"
                            @click="removeBlockedTime(block.id)"
                        >
                            Remove
                        </Button>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useTimezoneStore } from '../stores/timezoneStore'
import { useFormFeedback } from '../composables/useFormFeedback'
import { useAvailability } from '../composables/useAvailability'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const props = defineProps({
    instructorId: {
        type: String,
        required: true
    }
})

const timezoneStore = useTimezoneStore()
const { showSuccess, showError } = useFormFeedback()

const blockedStartDate = computed(() => new Date().toISOString())
const blockedEndDate = computed(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 3)
    return d.toISOString()
})

const {
    blockedSlots,
    createBlockedSlot,
    isCreatingBlockedSlot,
    deleteBlockedSlot,
    isDeletingBlockedSlot,
} = useAvailability(props.instructorId, null, blockedStartDate, blockedEndDate)

const blockedTimes = ref([])
const newBlock = ref({ startDateTime: '', endDateTime: '', reason: '' })

watch(blockedSlots, (val) => {
    if (val) blockedTimes.value = val
}, { immediate: true })

const formatDateTime = (datetime) => {
    return new Date(datetime).toLocaleString(undefined, {
        timeZone: timezoneStore.userTimezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: timezoneStore.use12HourFormat
    })
}

const addBlockedTime = async () => {
    try {
        await createBlockedSlot({
            startDateTime: new Date(newBlock.value.startDateTime).toISOString(),
            endDateTime: new Date(newBlock.value.endDateTime).toISOString(),
            reason: newBlock.value.reason
        })
        showSuccess('Blocked time added successfully')
        newBlock.value = { startDateTime: '', endDateTime: '', reason: '' }
    } catch (err) {
        showError('Failed to add blocked time')
        console.error(err)
    }
}

const removeBlockedTime = async (blockId) => {
    try {
        await deleteBlockedSlot(blockId)
        showSuccess('Blocked time removed successfully')
    } catch (err) {
        showError('Failed to remove blocked time')
        console.error(err)
    }
}
</script>

<style scoped>
.timezone-note {
    font-size: 0.875rem;
    color: var(--text-muted);
    background: #f8f9fa;
    padding: var(--spacing-sm) var(--spacing-md);
    border-left: 4px solid var(--primary-color);
    border-radius: var(--border-radius);
}

.block-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1.5fr;
    gap: var(--spacing-md);
    align-items: end;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.optional {
    font-weight: 400;
    color: var(--text-muted);
    font-size: 0.8em;
}

.list-heading {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
    color: var(--text-secondary);
}

.empty-state {
    color: var(--text-muted);
    font-size: 0.875rem;
    text-align: center;
    padding: var(--spacing-md);
}

.block-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.block-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
}

.block-details {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.block-dates {
    font-size: 0.875rem;
    font-weight: 500;
}

.block-reason {
    font-size: 0.8rem;
    color: var(--text-muted);
}

@media (max-width: 640px) {
    .form-row {
        grid-template-columns: 1fr;
    }
}
</style>
