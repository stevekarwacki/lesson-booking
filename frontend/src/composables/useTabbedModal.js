import { ref, computed } from 'vue'

export function useTabbedModal(tabs) {
  const activeTab = ref(tabs.find(t => t.default)?.id || tabs[0]?.id)
  const accordionState = ref({})
  
  // Initialize accordion state based on priority
  const initializeAccordionState = () => {
    accordionState.value = {}
    tabs.forEach(tab => {
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
  
  const defaultTab = computed(() => tabs.find(t => t.default))
  const secondaryTabs = computed(() => 
    tabs.filter(t => !t.default).sort((a, b) => {
      const priorities = { high: 1, medium: 2, low: 3 }
      return priorities[a.priority || 'medium'] - priorities[b.priority || 'medium']
    })
  )
  
  // Reset to default state (called when modal closes)
  const resetState = () => {
    activeTab.value = tabs.find(t => t.default)?.id || tabs[0]?.id
    initializeAccordionState()
  }
  
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