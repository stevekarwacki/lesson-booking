<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content tabbed-modal" @click.stop>
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      
      <!-- Desktop/Tablet: Tab Navigation -->
      <div v-if="$mq.smPlus" class="tab-navigation">
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
        <!-- Desktop/Tablet: Tab Content -->
        <div v-if="$mq.smPlus" class="tab-content">
          <component 
            :is="activeTabComponent" 
            v-if="activeTabComponent"
          />
        </div>
        
        <!-- Mobile: Primary Content + Accordions -->
        <div v-else class="mobile-accordion-container">
          <!-- Always visible default content -->
          <div v-if="defaultTab" class="primary-content">
            <component :is="getTabComponent(defaultTab.id)" />
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
                <div class="accordion-title">
                  <span v-if="tab.icon" class="accordion-icon">{{ tab.icon }}</span>
                  <span>{{ tab.label }}</span>
                  <span v-if="tab.badge" class="accordion-badge">{{ tab.badge }}</span>
                </div>
                <span class="accordion-toggle">
                  {{ accordionState[tab.id] ? '▼' : '▶' }}
                </span>
              </button>
              
              <div 
                :class="['accordion-content', { open: accordionState[tab.id] }]"
                :id="`accordion-${tab.id}`"
              >
                <component :is="getTabComponent(tab.id)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted } from 'vue'
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
      default: ''
    },
    closeOnOverlayClick: {
      type: Boolean,
      default: true
    },
    maxWidth: {
      type: String,
      default: '800px'
    }
  },
  emits: ['close'],
  setup(props, { emit, slots }) {
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
    
    const activeTabComponent = computed(() => {
      const tab = tabs.value.find(t => t.id === activeTab.value)
      return tab?.component
    })
    
    const getTabComponent = (tabId) => {
      const tab = tabs.value.find(t => t.id === tabId)
      return tab?.component
    }
    
    const handleOverlayClick = () => {
      if (props.closeOnOverlayClick) {
        emit('close')
      }
    }
    
    // Handle escape key
    const handleEscape = (event) => {
      if (event.key === 'Escape' && props.show) {
        emit('close')
      }
    }
    
    onMounted(() => {
      document.addEventListener('keydown', handleEscape)
    })
    
    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleEscape)
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
      handleOverlayClick
    }
  }
}
</script>

<style scoped>
@import '../styles/components/tabbed-modal.css';
</style> 