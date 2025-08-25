<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content tabbed-modal-extended" @click.stop :style="modalStyle">
      <div class="modal-header">
        <div class="header-content">
          <!-- Back button (only show when not on main view) -->
          <button 
            v-if="!isMainView" 
            class="back-button"
            @click="goBack"
            aria-label="Go back"
          >
            <span class="back-icon">‹</span>
            <span class="back-text">Back</span>
          </button>
          
          <h3>{{ currentTitle }}</h3>
        </div>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      
      <!-- Desktop/Tablet: Tab Navigation (only show on main view) -->
      <div v-if="$mq.smPlus && isMainView" class="tab-navigation">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="['tab-button', { active: activeTab === tab.id }]"
          @click="setActiveTab(tab.id)"
        >
          {{ tab.label }}
          <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
        </button>
      </div>
      
      <div class="modal-body">
        <!-- Slide container -->
        <div class="slide-container" :style="slideContainerStyle">
          <!-- Main view (tabs) -->
          <div class="slide-view main-view" :class="slideClasses.main">
            <!-- Desktop/Tablet: Tab Content -->
            <div v-if="$mq.smPlus" class="tab-content">
              <component 
                :is="activeTabComponent" 
                v-if="activeTabComponent"
                @navigate="handleNavigate"
              />
            </div>
            
            <!-- Mobile: Primary Content + Accordions -->
            <div v-else class="mobile-accordion-container">
              <!-- Always visible default content -->
              <div v-if="defaultTab" class="primary-content">
                <component 
                  :is="getTabComponent(defaultTab.id)" 
                  @navigate="handleNavigate"
                />
              </div>
              
              <!-- Accordion sections for non-default tabs -->
              <div v-if="secondaryTabs.length > 0" class="accordion-sections">
                <div 
                  v-for="tab in secondaryTabs" 
                  :key="tab.id"
                  class="accordion-section"
                >
                  <button 
                    class="accordion-header"
                    @click="toggleAccordion(tab.id)"
                    :aria-expanded="accordionState[tab.id]"
                    :aria-controls="`accordion-${tab.id}`"
                  >
                    <span class="accordion-title">
                      {{ tab.label }}
                      <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
                    </span>
                    <span class="accordion-icon" :class="{ expanded: accordionState[tab.id] }">
                      ▼
                    </span>
                  </button>
                  
                  <div 
                    v-show="accordionState[tab.id]"
                    :id="`accordion-${tab.id}`"
                    class="accordion-content"
                  >
                    <component 
                      :is="getTabComponent(tab.id)" 
                      @navigate="handleNavigate"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Secondary view (slide-in content) -->
          <div 
            v-if="secondaryView" 
            class="slide-view secondary-view" 
            :class="slideClasses.secondary"
          >
            <component 
              :is="secondaryView.component" 
              v-bind="secondaryView.props"
              @back="goBack"
              @navigate="handleNavigate"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useTabbedModal } from '../composables/useTabbedModal'

export default {
  name: 'TabbedModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      required: true
    },
    closeOnOverlayClick: {
      type: Boolean,
      default: true
    },
    initialHeight: {
      type: String,
      default: 'auto'
    }
  },
  emits: ['close'],
  setup(props, { emit, slots }) {
    // Slide transition state
    const isTransitioning = ref(false)
    const secondaryView = ref(null)
    const transitionDirection = ref('forward') // 'forward' or 'backward'
    
    // Parse tabs from slot children
    const tabs = computed(() => {
      const slotTabs = []
      const children = slots.default?.() || []
      
      children.forEach((child, index) => {
        if (child.type?.name === 'TabbedModalTab') {
          const tabProps = child.props || {}
          slotTabs.push({
            id: `tab-${index}`,
            label: tabProps.label || `Tab ${index + 1}`,
            badge: tabProps.badge,
            icon: tabProps.icon,
            priority: tabProps.priority || 'medium',
            default: tabProps.default || false,
            component: child
          })
        }
      })
      
      return slotTabs
    })
    
    const {
      activeTab,
      accordionState,
      setActiveTab,
      toggleAccordion,
      defaultTab,
      secondaryTabs
    } = useTabbedModal(tabs.value)
    
    // View state
    const isMainView = computed(() => !secondaryView.value)
    
    // Current title (changes based on view)
    const currentTitle = computed(() => {
      if (secondaryView.value && secondaryView.value.title) {
        return secondaryView.value.title
      }
      return props.title
    })
    
    // Active tab component
    const activeTabComponent = computed(() => {
      const tab = tabs.value.find(t => t.id === activeTab.value)
      return tab?.component
    })
    
    const getTabComponent = (tabId) => {
      const tab = tabs.value.find(t => t.id === tabId)
      return tab?.component
    }
    

    
    // Slide transition styles
    const slideClasses = computed(() => {
      if (!isTransitioning.value) {
        return {
          main: secondaryView.value ? 'slide-left' : '',
          secondary: secondaryView.value ? 'slide-in' : 'slide-out'
        }
      }
      
      if (transitionDirection.value === 'forward') {
        return {
          main: 'sliding-left',
          secondary: 'sliding-in'
        }
      } else {
        return {
          main: 'sliding-right',
          secondary: 'sliding-out'
        }
      }
    })
    
    const slideContainerStyle = computed(() => ({
      height: props.initialHeight,
      transition: isTransitioning.value ? 'height 0.3s ease-in-out' : 'none'
    }))
    
    const modalStyle = computed(() => ({
      maxHeight: secondaryView.value ? '90vh' : '80vh'
    }))
    
    // Navigation methods
    const handleNavigate = (navigationData) => {
      if (!navigationData.component) {
        console.warn('Navigation data must include a component')
        return
      }
      
      transitionDirection.value = 'forward'
      isTransitioning.value = true
      
      // Start transition
      setTimeout(() => {
        secondaryView.value = {
          component: navigationData.component,
          props: navigationData.props || {},
          title: navigationData.title || 'Details'
        }
        
        // End transition
        setTimeout(() => {
          isTransitioning.value = false
        }, 300)
      }, 50)
    }
    
    const goBack = () => {
      transitionDirection.value = 'backward'
      isTransitioning.value = true
      
      // Start transition
      setTimeout(() => {
        secondaryView.value = null
        
        // End transition
        setTimeout(() => {
          isTransitioning.value = false
        }, 300)
      }, 50)
    }
    
    // Modal controls
    const handleOverlayClick = () => {
      if (props.closeOnOverlayClick) {
        emit('close')
      }
    }
    
    // Handle escape key
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        if (secondaryView.value) {
          goBack()
        } else {
          emit('close')
        }
      }
    }
    
    // Lifecycle
    onMounted(() => {
      document.addEventListener('keydown', handleEscape)
    })
    
    onUnmounted(() => {
      document.removeEventListener('keydown', handleEscape)
    })
    
    // Reset secondary view when modal closes
    watch(() => props.show, (newShow) => {
      if (!newShow) {
        secondaryView.value = null
        isTransitioning.value = false
      }
    })
    
    return {
      tabs,
      activeTab,
      accordionState,
      setActiveTab,
      toggleAccordion,
      defaultTab,
      secondaryTabs,
      activeTabComponent,
      getTabComponent,
      handleOverlayClick,
      
      // Extended functionality
      isMainView,
      currentTitle,
      secondaryView,
      slideClasses,
      slideContainerStyle,
      modalStyle,
      handleNavigate,
      goBack,
      isTransitioning
    }
  }
}
</script>

<style src="../styles/components/tabbed-modal.css"></style>
<style scoped>
/* Extended modal specific overrides and additions */
.tabbed-modal-extended {
  position: relative;
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
}

/* Header with back button */
.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--font-size-base);
  padding: 0.5rem;
  transition: all var(--transition-normal);
  font-family: var(--font-family);
}

.back-button:hover {
  color: var(--text-primary);
  background: var(--background-hover);
}

.back-icon {
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 1;
}

.back-text {
  font-weight: 500;
}

/* Slide container */
.slide-container {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.slide-view {
  width: 100%;
  transition: transform 0.3s ease-in-out;
}

.secondary-view {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: var(--background-color);
}

/* Slide states */
.slide-left {
  transform: translateX(-100%);
}

.slide-in {
  transform: translateX(0);
}

.slide-out {
  transform: translateX(100%);
}

/* Transition states */
.sliding-left {
  transform: translateX(-100%);
}

.sliding-right {
  transform: translateX(0);
}

.sliding-in {
  transform: translateX(0);
}

.sliding-out {
  transform: translateX(100%);
}

/* Mobile responsiveness */
@media (max-width: 576px) {
  .back-text {
    display: none;
  }
  
  .back-icon {
    font-size: 1.25rem;
  }
}
</style>