<template>
  <div class="filter-tabs" :class="[variant, size]">
    <div class="filter-tabs-container">
      <button
        v-for="filter in filters"
        :key="filter.value"
        :class="[
          'filter-tab',
          { 
            active: activeFilter === filter.value,
            'has-count': showCounts && counts[filter.value] !== undefined
          }
        ]"
        @click="$emit('filter-change', filter.value)"
        :disabled="disabled"
        :aria-pressed="activeFilter === filter.value"
        :title="filter.description || filter.label"
      >
        <!-- Label -->
        <span class="filter-label">{{ filter.label }}</span>
        
        <!-- Count badge -->
        <span 
          v-if="showCounts && counts[filter.value] !== undefined" 
          class="filter-count"
          :class="{ 'zero-count': counts[filter.value] === 0 }"
        >
          {{ formatCount(counts[filter.value]) }}
        </span>
        
        <!-- Right arrow for navigation style -->
        <span v-if="variant === 'navigation'" class="filter-arrow">›</span>
      </button>
    </div>
    
    <!-- Loading state -->
    <div v-if="isLoading" class="filter-loading">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading...</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FilterTabs',
  props: {
    /**
     * Array of filter objects with label, value, icon, etc.
     */
    filters: {
      type: Array,
      required: true,
      validator: (filters) => {
        return filters.every(filter => 
          filter.label && filter.value !== undefined
        )
      }
    },
    
    /**
     * Currently active filter value
     */
    activeFilter: {
      type: [String, Number, Boolean],
      default: null
    },
    
    /**
     * Object with counts for each filter value
     */
    counts: {
      type: Object,
      default: () => ({})
    },
    
    /**
     * Whether to show count badges
     */
    showCounts: {
      type: Boolean,
      default: true
    },
    
    /**
     * Visual variant of the filter tabs
     */
    variant: {
      type: String,
      default: 'tabs',
      validator: (value) => ['tabs', 'pills', 'navigation', 'minimal'].includes(value)
    },
    
    /**
     * Size of the filter tabs
     */
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large'].includes(value)
    },
    
    /**
     * Whether the filter tabs are disabled
     */
    disabled: {
      type: Boolean,
      default: false
    },
    
    /**
     * Whether to show loading state
     */
    isLoading: {
      type: Boolean,
      default: false
    },
    
    /**
     * Maximum count to display (higher counts show as "99+")
     */
    maxCount: {
      type: Number,
      default: 99
    }
  },
  
  emits: ['filter-change'],
  
  setup(props) {
    const formatCount = (count) => {
      if (count === undefined || count === null) return ''
      if (count > props.maxCount) return `${props.maxCount}+`
      return count.toString()
    }
    
    return {
      formatCount
    }
  }
}
</script>

<style scoped>
.filter-tabs {
  position: relative;
}

.filter-tabs-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

/* Base filter tab styles */
.filter-tab {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 6px;
  background: var(--surface-color, white);
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  text-decoration: none;
  white-space: nowrap;
  position: relative;
}

.filter-tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.filter-tab:not(:disabled):hover {
  background-color: #f9fafb;
}
/* Default active state */
.filter-tab.active {
  background-color: #f3f4f6;
  color: #374151;
  border-color: #9ca3af;
}

/* Sizes */
.small .filter-tab {
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  gap: 0.25rem;
}

.medium .filter-tab {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  gap: 0.25rem;
}

.large .filter-tab {
  padding: 1rem 1.25rem;
  font-size: 1rem;
  gap: 0.75rem;
}

/* Filter elements */
.filter-icon {
  font-size: 1.1em;
  line-height: 1;
}

.filter-label {
  flex: 1;
}

.filter-count {
  background-color: var(--badge-bg, rgba(0, 0, 0, 0.1));
  color: var(--badge-text, var(--text-color));
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 1.25rem;
  text-align: center;
  line-height: 1.2;
}

.filter-tab.active .filter-count {
  background-color: #374151;
  color: white;
}

.filter-count.zero-count {
  opacity: 0.5;
}

.filter-arrow {
  font-size: 1.2em;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.filter-tab:hover .filter-arrow {
  opacity: 1;
}

/* Loading state */
.filter-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 8px;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--border-color, #e5e7eb);
  border-top-color: var(--primary-color, #3b82f6);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Mobile responsiveness */
@media (max-width: 576px) {
  .navigation .filter-tabs-container {
    flex-direction: column;
  }
  
  .tabs .filter-tabs-container,
  .pills .filter-tabs-container {
    justify-content: center;
  }
  
  .small .filter-tab {
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
  }
  
  .medium .filter-tab {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
  }
  
  .filter-icon {
    display: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .filter-tab {
    border-width: 2px;
  }
  
  .filter-tab.active {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .filter-tab {
    transition: none;
  }
  
  .loading-spinner {
    animation: none;
  }
}
</style>