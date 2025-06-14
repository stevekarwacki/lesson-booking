<template>
  <!-- This component doesn't render anything -->
</template>

<script setup>
import { onMounted } from 'vue';
import { useSubscriptionUpdate } from '../composables/useSubscriptionUpdate';

const { updateSubscriptionPeriods } = useSubscriptionUpdate();

onMounted(() => {
    updateSubscriptionPeriods();
});
</script> 