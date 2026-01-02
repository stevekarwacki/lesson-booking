import { ref, computed, watch, unref } from 'vue'

export function useTabbedModal(tabsRef) {
  // Unwrap the ref/computed to get initial value
  const tabs = computed(() => unref(tabsRef))
  
  const activeTab = ref(tabs.value.find(t => t.default)?.id || tabs.value[0]?.id)
  const accordionState = ref({})
  
  // Initialize accordion state based on priority
  const initializeAccordionState = () => {
    accordionState.value = {}
    tabs.value.forEach(tab => {
      if (!tab.default) {
        accordionState.value[tab.id] = tab.priority === 'high'
      }
    })
  }
  
  initializeAccordionState()
  
  const setActiveTab = (tabId) => {
    activeTab.value = tabId
  }
  
  const toggleAccordion = (tabId) => {
    accordionState.value[tabId] = !accordionState.value[tabId]
  }
  
  const defaultTab = computed(() => tabs.value.find(t => t.default))
  const secondaryTabs = computed(() => 
    tabs.value.filter(t => !t.default).sort((a, b) => {
      const priorities = { high: 1, medium: 2, low: 3 }
      return priorities[a.priority || 'medium'] - priorities[b.priority || 'medium']
    })
  )
  
  // Reset to default state (called when modal closes)
  const resetState = () => {
    activeTab.value = tabs.value.find(t => t.default)?.id || tabs.value[0]?.id
    initializeAccordionState()
  }
  
  // Watch for tab changes and reinitialize
  watch(tabs, () => {
    // Reinitialize accordion state when tabs change
    initializeAccordionState()
    // Reset active tab if current one no longer exists
    const currentTabExists = tabs.value.some(t => t.id === activeTab.value)
    if (!currentTabExists) {
      activeTab.value = tabs.value.find(t => t.default)?.id || tabs.value[0]?.id
    }
  }, { deep: true })
  
  return {
    activeTab,
    accordionState,
    setActiveTab,
    toggleAccordion,
    defaultTab,
    secondaryTabs,
    resetState
  }
} 