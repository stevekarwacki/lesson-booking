<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Refund Lesson</h2>
        <button @click="$emit('close')" class="close-button">×</button>
      </div>
      
      <div class="modal-body">
        <!-- Loading state -->
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading refund information...</p>
        </div>
        
        <!-- Error state -->
        <div v-else-if="error" class="error-state">
          <div class="error-message">
            <h3>Error</h3>
            <p>{{ error }}</p>
          </div>
          <div class="modal-actions">
            <button @click="$emit('close')" class="button button-secondary">Close</button>
          </div>
        </div>
        
        <!-- Refund form -->
        <div v-else-if="refundInfo">
          <!-- Booking details -->
          <div class="booking-summary">
            <h3>Lesson Details</h3>
            <div class="booking-details">
              <div class="detail-row">
                <span class="label">Date:</span>
                <span class="value">{{ formatDate(refundInfo.booking.date) }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Time:</span>
                <span class="value">{{ formatTimeSlot(refundInfo.booking.startSlot, refundInfo.booking.duration) }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Student:</span>
                <span class="value">{{ refundInfo.booking.student?.name || 'Unknown' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Status:</span>
                <span class="value status" :class="`status-${refundInfo.booking.status}`">
                  {{ refundInfo.booking.status }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Already refunded message -->
          <div v-if="refundInfo.refundStatus.status !== 'none'" class="refund-status">
            <div class="alert alert-info">
              <h4>This lesson has already been refunded</h4>
              <div class="refund-details">
                <p><strong>Refund Type:</strong> {{ refundInfo.refundStatus.type === 'stripe' ? 'Original Payment Method' : 'Lesson Credits' }}</p>
                <p><strong>Refunded On:</strong> {{ formatDate(refundInfo.refundStatus.refunded_at) }}</p>
                <p v-if="refundInfo.refundStatus.amount > 0"><strong>Amount:</strong> ${{ refundInfo.refundStatus.amount }}</p>
              </div>
            </div>
            <div class="modal-actions">
              <button @click="$emit('close')" class="button button-secondary">Close</button>
            </div>
          </div>
          
          <!-- Refund options -->
          <div v-else-if="refundInfo.canRefund && refundInfo.refundOptions.length > 0">
            <div class="refund-options">
              <h3>Refund Options</h3>
              <p class="refund-description">
                Choose how to process the refund for this lesson:
              </p>
              
              <div class="refund-choices">
                <div 
                  v-for="option in refundInfo.refundOptions" 
                  :key="option.type"
                  class="refund-option"
                  :class="{ 'selected': selectedRefundType === option.type, 'default': option.isDefault }"
                  @click="selectedRefundType = option.type"
                >
                  <div class="option-header">
                    <input 
                      type="radio" 
                      :value="option.type" 
                      v-model="selectedRefundType"
                      :id="`refund-${option.type}`"
                    />
                    <label :for="`refund-${option.type}`" class="option-label">
                      {{ option.label }}
                      <span v-if="option.isDefault" class="default-badge">Recommended</span>
                    </label>
                  </div>
                  <p class="option-description">{{ option.description }}</p>
                </div>
              </div>
            </div>
            
            <!-- Reason field -->
            <div class="refund-reason">
              <label for="refund-reason">Reason for refund (optional):</label>
              <textarea 
                id="refund-reason"
                v-model="refundReason"
                placeholder="Enter reason for refund..."
                rows="3"
                maxlength="500"
              ></textarea>
              <div class="character-count">{{ refundReason.length }}/500</div>
            </div>
            
            <!-- Confirmation -->
            <div class="refund-confirmation">
              <label class="checkbox-container">
                <input type="checkbox" v-model="confirmRefund" />
                <span class="checkmark"></span>
                I confirm that I want to process this refund
              </label>
            </div>
            
            <!-- Actions -->
            <div class="modal-actions">
              <button @click="$emit('close')" class="button button-secondary">Cancel</button>
              <button 
                @click="handleProcessRefund" 
                class="button button-danger"
                :disabled="!selectedRefundType || !confirmRefund || processing"
              >
                <span v-if="processing">Processing...</span>
                <span v-else>Process Refund</span>
              </button>
            </div>
          </div>
          
          <!-- Cannot refund -->
          <div v-else>
            <div class="alert alert-warning">
              <h4>Cannot Process Refund</h4>
              <p v-if="!refundInfo.canRefund">This lesson cannot be refunded (it may be cancelled or completed).</p>
              <p v-else-if="refundInfo.refundOptions.length === 0">No refund options are available for this lesson.</p>
            </div>
            <div class="modal-actions">
              <button @click="$emit('close')" class="button button-secondary">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useRefunds } from '../composables/useRefunds'

const props = defineProps({
  booking: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'refund-processed'])

const userStore = useUserStore()
const {
    refundInfo,
    isLoadingRefundInfo,
    refundInfoError,
    processRefund,
    isProcessingRefund
} = useRefunds(computed(() => props.booking?.id))

const loading = isLoadingRefundInfo
const processing = isProcessingRefund
const error = ref(null)
const selectedRefundType = ref('')
const refundReason = ref('')
const confirmRefund = ref(false)

// Watch for refundInfo to auto-select default option
watch(refundInfo, (info) => {
    if (info) {
        const defaultOption = info.refundOptions?.find(opt => opt.isDefault)
        if (defaultOption) {
            selectedRefundType.value = defaultOption.type
        } else if (info.refundOptions?.length === 1) {
            selectedRefundType.value = info.refundOptions[0].type
        }
    }
}, { immediate: true })

// Watch for refund info error
watch(refundInfoError, (err) => {
    if (err) {
        error.value = err.message || 'Failed to load refund information'
    }
}, { immediate: true })

// Refund info is automatically loaded via useRefunds composable

const handleProcessRefund = async () => {
  if (!selectedRefundType.value || !confirmRefund.value) return
  
  try {
    error.value = null
    
    const result = await processRefund({
      bookingId: props.booking.id,
      refundType: selectedRefundType.value,
      reason: refundReason.value.trim() || null,
      studentId: props.booking.student_id, // For cache invalidation
      instructorId: props.booking.instructor_id // For calendar refresh
    })
    
    emit('refund-processed', {
      booking: props.booking,
      refund: result.refund
    })
    emit('close')
    
  } catch (err) {
    console.error('Error processing refund:', err)
    error.value = err.message || 'Failed to process refund'
  }
}

// Utility functions
const formatDate = (dateString) => {
  // Handle date string as local date to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(num => parseInt(num))
  const date = new Date(year, month - 1, day) // month is 0-indexed
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatTimeSlot = (startSlot, duration) => {
  const startHour = Math.floor(startSlot / 4)
  const startMinute = (startSlot % 4) * 15
  const endSlot = startSlot + duration
  const endHour = Math.floor(endSlot / 4)
  const endMinute = (endSlot % 4) * 15
  
  const formatTime = (hour, minute) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
  }
  
  return `${formatTime(startHour, startMinute)} - ${formatTime(endHour, endMinute)}`
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 24px;
}

.loading-state, .error-state {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.booking-summary {
  margin-bottom: 24px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.booking-summary h3 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 1.1rem;
}

.booking-details {
  display: grid;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-weight: 500;
  color: #6b7280;
}

.value {
  color: #1f2937;
}

.status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-booked { background: #dbeafe; color: #1e40af; }
.status-cancelled { background: #fee2e2; color: #dc2626; }
.status-completed { background: #d1fae5; color: #059669; }

.refund-status {
  margin-bottom: 24px;
}

.alert {
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.alert-info {
  background: #dbeafe;
  border: 1px solid #93c5fd;
  color: #1e40af;
}

.alert-warning {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  color: #92400e;
}

.alert h4 {
  margin: 0 0 8px 0;
  font-size: 1rem;
}

.refund-details p {
  margin: 4px 0;
  font-size: 0.875rem;
}

.refund-options {
  margin-bottom: 24px;
}

.refund-options h3 {
  margin: 0 0 8px 0;
  color: #374151;
}

.refund-description {
  color: #6b7280;
  margin-bottom: 16px;
}

.refund-choices {
  display: grid;
  gap: 12px;
}

.refund-option {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.refund-option:hover {
  border-color: #d1d5db;
}

.refund-option.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.refund-option.default {
  border-color: #10b981;
}

.refund-option.default.selected {
  border-color: #059669;
  background: #ecfdf5;
}

.option-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.option-label {
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.default-badge {
  background: #10b981;
  color: white;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.option-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
  margin-left: 32px;
}

.refund-reason {
  margin-bottom: 24px;
}

.refund-reason label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.refund-reason textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 80px;
}

.refund-reason textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.character-count {
  text-align: right;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 4px;
}

.refund-confirmation {
  margin-bottom: 24px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-weight: 500;
  color: #374151;
}

.checkbox-container input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.button {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-secondary {
  background: #f3f4f6;
  color: #374151;
}

.button-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.button-danger {
  background: #dc2626;
  color: white;
}

.button-danger:hover:not(:disabled) {
  background: #b91c1c;
}
</style>
