<template>
  <div class="slide-transition-container">
    <!-- Back button (only show when not on first slide) -->
    <button 
      v-if="currentSlideIndex > 0"
      class="slide-back-button"
      @click="goBack"
    >
      ‹ Back
    </button>

    <!-- Slide container -->
    <div class="slide-wrapper">
      <div 
        class="slide-content"
        :style="{ 
          transform: `translateX(-${currentSlideIndex * (100 / slideCount)}%)`,
          width: `${slideCount * 100}%`
        }"
      >
        <!-- Slide 1 (Main) -->
        <div class="slide-view" :style="{ width: `${100 / slideCount}%` }">
          <slot 
            name="main"
            :navigate="navigateToDetail"
            :goBack="goBack"
            :currentSlide="currentSlideIndex"
          />
        </div>

        <!-- Slide 2 (Detail) -->
        <div class="slide-view" :style="{ width: `${100 / slideCount}%` }">
          <slot 
            name="detail"
            :navigate="navigateToFinal"
            :goBack="goBack"
            :currentSlide="currentSlideIndex"
          />
        </div>

        <!-- Slide 3 (Final) - only if we have 3 slides -->
        <div v-if="slideCount > 2" class="slide-view" :style="{ width: `${100 / slideCount}%` }">
          <slot 
            name="final"
            :navigate="goBack"
            :goBack="goBack"
            :currentSlide="currentSlideIndex"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'SlideTransition',
  props: {
    slideCount: {
      type: Number,
      default: 2
    }
  },
  emits: ['slide-changed'],
  setup(props, { emit }) {
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
        currentSlideIndex.value = currentSlideIndex.value - 1
        const names = ['main', 'detail', 'final']
        emit('slide-changed', { 
          index: currentSlideIndex.value, 
          name: names[currentSlideIndex.value] 
        })
      }
    }

    return {
      currentSlideIndex,
      slideCount: props.slideCount,
      navigateToDetail,
      navigateToFinal,
      goBack
    }
  }
}
</script>

<style scoped>
.slide-transition-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.slide-back-button {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  background: none;
  border: none;
  font-size: 16px;
  color: #666;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.slide-back-button:hover {
  background-color: #f5f5f5;
}

.slide-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.slide-content {
  display: flex;
  height: 100%;
  transition: transform 0.3s ease-in-out;
}

.slide-view {
  flex-shrink: 0;
  padding: 20px 0;
}

.slide-view:not(:first-child) {
  padding-top: 40px; /* Space for back button */
}
</style>