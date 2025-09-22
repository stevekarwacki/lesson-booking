<template>
  <div class="settings-tabs">
    <!-- Desktop/Tablet: Tab Navigation -->
    <div v-if="$mq.smPlus" class="tab-navigation">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="setActiveTab(tab.id)"
        :disabled="tab.disabled"
        :aria-selected="activeTab === tab.id"
        role="tab"
      >
        <span v-if="tab.icon" class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
      </button>
    </div>
    
    <!-- Tab Content -->
    <div class="tab-content-wrapper">
      <!-- Desktop/Tablet: Direct Tab Content -->
      <div v-if="$mq.smPlus" class="tab-content">
        <component 
          :is="activeTabComponent" 
          v-if="activeTabComponent"
          v-bind="activeTabProps"
          @change="handleTabContentChange"
        />
      </div>
      
      <!-- Mobile: Accordion Layout -->
      <div v-else class="mobile-accordion-container">
        <!-- Always visible default content -->
        <div v-if="defaultTab" class="primary-content">
          <div class="primary-content-header">
            <h3>{{ defaultTab.label }}</h3>
          </div>
          <component 
            :is="getTabComponent(defaultTab.id)" 
            v-bind="getTabProps(defaultTab.id)"
            @change="handleTabContentChange"
          />
        </div>
        
        <!-- Accordion sections for non-default tabs -->
        <div class="accordion-sections">
          <div 
            v-for="tab in secondaryTabs" 
            :key="tab.id"
            class="accordion-section"
          >
            <button 
              class="accordion-header"
              @click="toggleAccordion(tab.id)"
              :aria-expanded="accordionState[tab.id] || false"
              :disabled="tab.disabled"
            >
              <div class="accordion-title">
                <span v-if="tab.icon" class="tab-icon">{{ tab.icon }}</span>
                <span>{{ tab.label }}</span>
                <span v-if="tab.badge" class="accordion-badge">{{ tab.badge }}</span>
              </div>
              <span 
                class="accordion-toggle"
                :class="{ expanded: accordionState[tab.id] }"
              >
                ▼
              </span>
            </button>
            <div 
              class="accordion-content"
              :class="{ open: accordionState[tab.id] }"
            >
              <div class="accordion-inner">
                <component 
                  :is="getTabComponent(tab.id)" 
                  v-if="accordionState[tab.id]"
                  v-bind="getTabProps(tab.id)"
                  @change="handleTabContentChange"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'SettingsTabs',
  props: {
    /**
     * Array of tab configuration objects
     * Each tab should have: { id, label, component, icon?, badge?, disabled?, props? }
     */
    tabs: {
      type: Array,
      required: true,
      validator: (tabs) => {
        return tabs.every(tab => 
          tab.id && tab.label && tab.component
        )
      }
    },
    
    /**
     * ID of the initially active tab
     */
    initialTab: {
      type: String,
      default: null
    },
    
    /**
     * ID of the default tab (shown in mobile primary content)
     */
    defaultTabId: {
      type: String,
      default: null
    },
    
    /**
     * Whether to auto-select first tab if no initial tab specified
     */
    autoSelectFirst: {
      type: Boolean,
      default: true
    }
  },
  
  emits: ['tab-change', 'content-change'],
  
  setup(props, { emit }) {
    // Active tab state
    const activeTab = ref(
      props.initialTab || 
      (props.autoSelectFirst ? props.tabs[0]?.id : null)
    )
    
    // Mobile accordion state
    const accordionState = ref({})
    
    // Computed properties
    const defaultTab = computed(() => {
      if (props.defaultTabId) {
        return props.tabs.find(tab => tab.id === props.defaultTabId)
      }
      return props.tabs[0] // Fallback to first tab
    })
    
    const secondaryTabs = computed(() => {
      const defaultTabId = defaultTab.value?.id
      return props.tabs.filter(tab => tab.id !== defaultTabId)
    })
    
    const activeTabComponent = computed(() => {
      const tab = props.tabs.find(tab => tab.id === activeTab.value)
      return tab?.component
    })
    
    const activeTabProps = computed(() => {
      const tab = props.tabs.find(tab => tab.id === activeTab.value)
      return tab?.props || {}
    })
    
    // Methods
    const setActiveTab = (tabId) => {
      if (activeTab.value !== tabId) {
        activeTab.value = tabId
        emit('tab-change', tabId)
      }
    }
    
    const toggleAccordion = (tabId) => {
      accordionState.value = {
        ...accordionState.value,
        [tabId]: !accordionState.value[tabId]
      }
    }
    
    const getTabComponent = (tabId) => {
      const tab = props.tabs.find(tab => tab.id === tabId)
      return tab?.component
    }
    
    const getTabProps = (tabId) => {
      const tab = props.tabs.find(tab => tab.id === tabId)
      return tab?.props || {}
    }
    
    const handleTabContentChange = (data) => {
      emit('content-change', {
        tabId: activeTab.value,
        ...data
      })
    }
    
    // Watch for external tab changes
    watch(() => props.initialTab, (newTab) => {
      if (newTab && newTab !== activeTab.value) {
        setActiveTab(newTab)
      }
    })
    
    return {
      activeTab,
      accordionState,
      defaultTab,
      secondaryTabs,
      activeTabComponent,
      activeTabProps,
      setActiveTab,
      toggleAccordion,
      getTabComponent,
      getTabProps,
      handleTabContentChange
    }
  }
}
</script>

<style scoped>
.settings-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  border-bottom: 2px solid var(--border-color);
  background: var(--background-light);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  flex-shrink: 0;
  border-radius: var(--border-radius) var(--border-radius) 0 0;
}

.tab-navigation::-webkit-scrollbar {
  display: none;
}

.tab-button {
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  color: var(--text-secondary);
  font-size: var(--font-size-base);
  transition: all var(--transition-normal);
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-family);
  font-weight: 500;
  min-height: 60px;
}

.tab-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-button:not(:disabled):hover {
  color: var(--text-primary);
  background: var(--background-hover);
}

.tab-button.active {
  color: var(--primary-color);
  background: var(--background-light);
  font-weight: 600;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--primary-color);
}

.tab-button:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: -2px;
}

.tab-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.tab-label {
  flex: 1;
}

.tab-badge {
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.6rem;
  border-radius: 1rem;
  font-size: var(--font-size-sm);
  font-weight: 600;
  min-width: 1.5rem;
  text-align: center;
  line-height: 1.2;
}

/* Content Wrapper */
.tab-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Desktop Tab Content */
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
  background: var(--background-light);
  border-radius: 0 0 var(--border-radius) var(--border-radius);
}

/* Mobile Accordion Styles */
.mobile-accordion-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
}

.primary-content {
  background: var(--background-light);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.primary-content-header {
  padding: var(--spacing-md) var(--spacing-md) 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: var(--spacing-md);
}

.primary-content-header h3 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.primary-content > :deep(> *) {
  padding: 0 var(--spacing-md) var(--spacing-md);
}

.accordion-sections {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.accordion-section {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;
  background: var(--background-light);
  box-shadow: var(--card-shadow);
}

.accordion-header {
  width: 100%;
  padding: 1rem var(--spacing-md);
  background: var(--background-light);
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  min-height: 60px;
  transition: background var(--transition-normal);
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  color: var(--text-primary);
  font-weight: 500;
}

.accordion-header:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.accordion-header:not(:disabled):hover {
  background: var(--background-hover);
}

.accordion-header:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: -2px;
}

.accordion-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  font-weight: 500;
}

.accordion-badge {
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.6rem;
  border-radius: 1rem;
  font-size: var(--font-size-sm);
  font-weight: 600;
  min-width: 1.5rem;
  text-align: center;
  margin-left: auto;
  margin-right: var(--spacing-sm);
}

.accordion-toggle {
  color: var(--text-secondary);
  font-size: 0.9rem;
  transition: transform var(--transition-normal);
  width: 1.2rem;
  text-align: center;
  font-weight: bold;
}

.accordion-toggle.expanded {
  transform: rotate(180deg);
}

.accordion-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--background-light);
}

.accordion-content.open {
  max-height: 2000px; /* Large enough value for content */
}

.accordion-inner {
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

/* Responsive Design */
@media (max-width: 575px) {
  .tab-button {
    padding: 0.75rem 1rem;
    font-size: var(--font-size-sm);
    min-height: 50px;
  }
  
  .primary-content-header {
    padding: var(--spacing-sm) var(--spacing-sm) 0;
    margin-bottom: var(--spacing-sm);
  }
  
  .accordion-inner {
    padding: var(--spacing-sm);
  }
  
  .mobile-accordion-container {
    padding: var(--spacing-sm);
  }
  
  .tab-content {
    padding: var(--spacing-md);
  }
}

@media (min-width: 576px) and (max-width: 767px) {
  .tab-navigation {
    flex-wrap: wrap;
  }
  
  .tab-button {
    flex: 1;
    min-width: 0;
    justify-content: center;
  }
}

@media (min-width: 992px) {
  .tab-button {
    padding: 1rem 2rem;
    min-height: 64px;
  }
  
  .tab-content {
    padding: var(--spacing-xl);
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .accordion-content {
    transition: none;
  }
  
  .accordion-toggle {
    transition: none;
  }
  
  .tab-button {
    transition: none;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .tab-button {
    border: 1px solid transparent;
  }
  
  .tab-button.active {
    border-color: var(--primary-color);
  }
  
  .accordion-section {
    border-width: 2px;
  }
}
</style>
