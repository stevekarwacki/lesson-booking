<template>
  <div class="tabbed-modal-tab">
    <slot />
  </div>
</template>

<script>
export default {
  name: 'TabbedModalTab',
  props: {
    label: {
      type: String,
      required: true
    },
    badge: {
      type: [String, Number],
      default: null
    },
    icon: {
      type: String,
      default: null
    },
    priority: {
      type: String,
      default: 'medium',
      validator: (value) => ['high', 'medium', 'low'].includes(value)
    },
    default: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>
.tabbed-modal-tab {
  height: 100%;
}
</style> 