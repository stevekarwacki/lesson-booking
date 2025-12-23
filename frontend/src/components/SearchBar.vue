<template>
  <div class="search-bar">
    <div class="search-input-wrapper">
      <span class="search-icon">🔍</span>
      <input
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
        type="text"
        :placeholder="placeholder"
        class="search-input"
        :disabled="disabled"
      />
      <button
        v-if="modelValue"
        @click="handleClear"
        class="clear-search"
        aria-label="Clear search"
        type="button"
      >
        ✕
      </button>
      
      <!-- Dropdown Results -->
      <div 
        v-if="showResults && results.length > 0" 
        class="search-results"
      >
        <div 
          v-for="result in results" 
          :key="result.id"
          class="search-result-item"
          @mousedown="handleSelect(result)"
        >
          <slot name="result" :result="result">
            <!-- Default result display -->
            <div class="result-content">
              <div class="result-primary">{{ result.name || 'Unknown' }}</div>
              <div class="result-secondary">{{ result.email }}</div>
            </div>
          </slot>
        </div>
      </div>
      
      <!-- No Results Message -->
      <div 
        v-if="showResults && modelValue.length >= minChars && results.length === 0" 
        class="search-no-results"
      >
        No results found
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SearchBar',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: 'Search...'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    results: {
      type: Array,
      default: () => []
    },
    showResults: {
      type: Boolean,
      default: false
    },
    minChars: {
      type: Number,
      default: 2
    }
  },
  emits: ['update:modelValue', 'select', 'focus', 'blur'],
  methods: {
    handleSelect(result) {
      this.$emit('select', result)
    },
    handleClear() {
      this.$emit('update:modelValue', '')
      this.$emit('blur')
    }
  }
}
</script>

<style scoped>
.search-bar {
  width: 100%;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.2rem;
  opacity: 0.5;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.75rem 3rem 0.75rem 3rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  background-color: white;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
}

.search-input:disabled {
  background-color: #f9fafb;
  cursor: not-allowed;
  opacity: 0.6;
}

.clear-search {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
  line-height: 1;
  transition: color 0.2s ease;
}

.clear-search:hover {
  color: var(--text-color);
}

.clear-search:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Search Results Dropdown */
.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
}

.search-result-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f3f4f6;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background-color: #f9fafb;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.result-primary {
  font-weight: 500;
  color: var(--text-color);
}

.result-secondary {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.search-no-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  padding: 1rem;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.875rem;
  z-index: 1000;
}

/* Mobile responsiveness */
@media (max-width: 576px) {
  .search-input {
    font-size: 0.875rem;
    padding: 0.625rem 2.5rem 0.625rem 2.5rem;
  }
  
  .search-icon {
    left: 0.75rem;
    font-size: 1rem;
  }
  
  .clear-search {
    right: 0.5rem;
    font-size: 1rem;
  }
}
</style>

