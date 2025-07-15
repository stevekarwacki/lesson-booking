import { ref, computed } from 'vue'

export function useTabbedModal(tabs) {
  const activeTab = ref(tabs.find(t => t.default)?.id || tabs[0]?.id)
  const accordionState = ref({})
  
  // Initialize accordion state based on priority
  tabs.forEach(tab => {
    if (!tab.default) {
      accordionState.value[tab.id] = tab.priority === 'high'
    }
  })
  
  const setActiveTab = (tabId) => {
    activeTab.value = tabId
  }
  
  const toggleAccordion = (tabId) => {
    accordionState.value[tabId] = !accordionState.value[tabId]
    
    // Save accordion state to localStorage
    localStorage.setItem('tabbedModalAccordion', JSON.stringify(accordionState.value))
  }
  
  const defaultTab = computed(() => tabs.find(t => t.default))
  const secondaryTabs = computed(() => 
    tabs.filter(t => !t.default).sort((a, b) => {
      const priorities = { high: 1, medium: 2, low: 3 }
      return priorities[a.priority || 'medium'] - priorities[b.priority || 'medium']
    })
  )
  
  // Load saved accordion state
  const loadAccordionState = () => {
    try {
      const saved = localStorage.getItem('tabbedModalAccordion')
      if (saved) {
        const parsedState = JSON.parse(saved)
        Object.keys(parsedState).forEach(key => {
          if (accordionState.value.hasOwnProperty(key)) {
            accordionState.value[key] = parsedState[key]
          }
        })
      }
    } catch (error) {
      console.warn('Failed to load accordion state:', error)
    }
  }
  
  // Initialize with saved state
  loadAccordionState()
  
  return {
    activeTab,
    accordionState,
    setActiveTab,
    toggleAccordion,
    defaultTab,
    secondaryTabs
  }
} 