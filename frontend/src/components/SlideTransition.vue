<template>
  <div class="slide-transition">
    <!-- Back button (only show when not on first slide) -->
    <button 
      v-if="currentSlideIndex > 0 && showBackButton"
      class="slide-back-button"
      @click="goBack"
    >
      ‹ Back
    </button>

    <!-- Viewport clips off-screen slides -->
    <div class="slide-viewport">
      <!-- Slide container with horizontal transform -->
      <div 
        class="slide-container"
        :style="{ transform: `translateX(-${currentSlideIndex * 100}%)` }"
      >
        <!-- Slide 0 (Main) -->
        <div class="slide">
          <slot 
            name="main"
            :navigate="navigateToDetail"
            :goBack="goBack"
            :currentSlide="currentSlideIndex"
          />
        </div>

        <!-- Slide 1 (Detail) -->
        <div class="slide">
          <slot 
            name="detail"
            :navigate="navigateToFinal"
            :goBack="goBack"
            :currentSlide="currentSlideIndex"
          />
        </div>

        <!-- Slide 2 (Final) - optional -->
        <div v-if="slideCount > 2" class="slide">
          <slot 
            name="final"
            :goBack="goBack"
            :currentSlide="currentSlideIndex"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  slideCount: {
    type: Number,
    default: 2
  },
  showBackButton: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['slide-changed'])

const currentSlideIndex = ref(0)

const navigateToDetail = () => {
  currentSlideIndex.value = 1
  emit('slide-changed', { index: 1, name: 'detail' })
}

const navigateToFinal = () => {
  if (props.slideCount > 2) {
    currentSlideIndex.value = 2
    emit('slide-changed', { index: 2, name: 'final' })
  }
}

const goBack = () => {
  if (currentSlideIndex.value > 0) {
    currentSlideIndex.value--
    const names = ['main', 'detail', 'final']
    emit('slide-changed', { 
      index: currentSlideIndex.value, 
      name: names[currentSlideIndex.value] 
    })
  }
}

// Expose methods for parent components
defineExpose({ goBack, currentSlideIndex })
</script>

<style scoped>
.slide-transition {
  width: 100%;
  height: 100%; /* Fill the modal-body */
  position: relative;
}

.slide-back-button {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  background: none;
  border: none;
  font-size: 16px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.slide-back-button:hover {
  background-color: hsl(var(--muted) / 0.5);
}

/* Viewport clips off-screen slides and defines height */
.slide-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Container holds all slides horizontally */
.slide-container {
  display: flex;
  height: 100%;
  transition: transform 0.3s ease-in-out;
}

.slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  overflow-y: auto; /* Each slide scrolls its own content */
  overflow-x: hidden; /* Prevent horizontal scroll */
  padding-right: 20px; /* padding between scroll bar and the content */
}

/* Add padding for back button on non-first slides */
.slide:not(:first-child) {
  padding-top: 40px;
}
</style>