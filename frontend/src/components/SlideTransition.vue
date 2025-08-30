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
    <div 
      ref="slideWrapper"
      class="slide-wrapper"
      :style="{ 
        height: containerHeight ? `${containerHeight}px` : 'auto',
        transition: isPreparingReturn ? 'height 0.3s ease-in-out' : 'none'
      }"
    >
      <div 
        class="slide-content"
        :style="{ 
          transform: `translateX(-${slideTransform}%)`,
          width: `${activeSlideCount * 100}%`
        }"
        @transitionend="onTransitionEnd"
      >
        <!-- Slide 1 (Main) -->
        <div v-if="shouldShowSlide(0)" ref="mainSlide" class="slide-view" :style="{ width: `${100 / slideCount}%` }">
          <slot 
            name="main"
            :navigate="navigateToDetail"
            :goBack="goBack"
            :currentSlide="currentSlideIndex"
            :updateStoredHeight="updateStoredHeight"
          />
        </div>

        <!-- Slide 2 (Detail) -->
        <div v-if="shouldShowSlide(1)" class="slide-view" :style="{ width: `${100 / slideCount}%` }">
          <slot 
            name="detail"
            :navigate="navigateToFinal"
            :goBack="goBack"
            :currentSlide="currentSlideIndex"
          />
        </div>

        <!-- Slide 3 (Final) - only if we have 3 slides -->
        <div v-if="slideCount > 2 && shouldShowSlide(2)" class="slide-view" :style="{ width: `${100 / slideCount}%` }">
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
import { ref, computed, nextTick, onMounted } from 'vue'

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
    const isTransitioning = ref(false)
    const previousSlideIndex = ref(null)
    const containerHeight = ref(null)
    const storedMainHeight = ref(null)
    const slideWrapper = ref(null)
    const mainSlide = ref(null)
    const isPreparingReturn = ref(false)

    // Always render all slides - don't remove from DOM
    const activeSlideCount = computed(() => {
      return props.slideCount
    })

    // Calculate the correct transform based on current slide
    const slideTransform = computed(() => {
      // Simple: show the current slide by moving the container
      return currentSlideIndex.value * (100 / props.slideCount)
    })

    // Always show all slides - keep them in DOM
    const shouldShowSlide = (slideIndex) => {
      return slideIndex < props.slideCount
    }

    // Store main slide height when first rendered
    const storeMainHeight = async () => {
      await nextTick()
      if (mainSlide.value && currentSlideIndex.value === 0) {
        storedMainHeight.value = mainSlide.value.scrollHeight
      }
    }

    // Method to manually trigger height storage (for when content loads)
    const updateStoredHeight = () => {
      if (currentSlideIndex.value === 0) {
        storeMainHeight()
      }
    }

    // Set container to stored main height (for return transition)
    const prepareReturn = async () => {
      if (storedMainHeight.value && slideWrapper.value) {
        isPreparingReturn.value = true
        containerHeight.value = storedMainHeight.value
        
        // Wait for height transition to complete
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Now proceed with slide transition
        executeSlideTransition()
      } else {
        // Fallback if no stored height
        executeSlideTransition()
      }
    }

    const executeSlideTransition = () => {
      previousSlideIndex.value = currentSlideIndex.value
      isTransitioning.value = true
      currentSlideIndex.value = currentSlideIndex.value - 1
      
      const names = ['main', 'detail', 'final']
      emit('slide-changed', { 
        index: currentSlideIndex.value, 
        name: names[currentSlideIndex.value] 
      })
    }

    const onTransitionEnd = (event) => {
      if (event.propertyName === 'transform') {
        // Slide transition completed
        isTransitioning.value = false
        previousSlideIndex.value = null
        
        // Reset height management
        if (isPreparingReturn.value) {
          isPreparingReturn.value = false
          // Force container to natural height immediately
          containerHeight.value = null
        }
        
        // Store main height if we're back on main slide
        if (currentSlideIndex.value === 0) {
          // Small delay to let the DOM settle after height reset
          setTimeout(() => {
            storeMainHeight()
          }, 100)
        }
      }
    }

    // Initialize main height on mount with delay to allow content to load
    onMounted(() => {
      setTimeout(() => {
        storeMainHeight()
      }, 100)
    })

    const navigateToDetail = () => {
      // Store current height before navigating away
      storeMainHeight()
      
      previousSlideIndex.value = currentSlideIndex.value
      isTransitioning.value = true
      currentSlideIndex.value = 1
      emit('slide-changed', { index: 1, name: 'detail' })
    }

    const navigateToFinal = () => {
      if (props.slideCount > 2) {
        previousSlideIndex.value = currentSlideIndex.value
        isTransitioning.value = true
        currentSlideIndex.value = 2
        emit('slide-changed', { index: 2, name: 'final' })
      }
    }

    const goBack = () => {
      if (currentSlideIndex.value > 0) {
        // Use the special return preparation if going back to main slide
        if (currentSlideIndex.value === 1 && storedMainHeight.value) {
          prepareReturn()
        } else {
          executeSlideTransition()
        }
      }
    }

    return {
      currentSlideIndex,
      activeSlideCount,
      slideTransform,
      shouldShowSlide,
      onTransitionEnd,
      updateStoredHeight,
      slideWrapper,
      mainSlide,
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
  overflow: hidden;
  position: relative;
}

.slide-content {
  display: flex;
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