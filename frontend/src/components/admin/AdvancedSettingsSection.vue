<template>
  <div class="advanced-settings-section">
    <div class="subsections">
      <!-- Storage Section -->
      <StorageSection />
    </div>
  </div>
</template>

<script setup>
import StorageSection from './StorageSection.vue'
</script>

<style scoped>
.advanced-settings-section {
  padding: 20px;
}

.section-header {
  margin-bottom: 30px;
}

.section-header h2 {
  font-size: 24px;
  margin-bottom: 10px;
  color: #333;
}

.section-description {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.subsections {
  display: flex;
  flex-direction: column;
  gap: 30px;
}
</style>
