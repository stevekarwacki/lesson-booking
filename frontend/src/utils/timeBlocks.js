/**
 * Time Block Utilities
 * 
 * Handles conversion from slot-based schedule data to continuous time blocks.
 * Eliminates slot expansion - one block per event/gap.
 * Special handling for available blocks to maintain 30-minute selection precision.
 */

/**
 * Time Block Model
 * @typedef {Object} TimeBlock
 * @property {string} id - Unique identifier (booking ID or generated for gaps)
 * @property {number} startSlot - Starting slot (0-95)
 * @property {number} duration - Duration in slots (2=30min, 4=60min, etc.)
 * @property {string} type - 'booked' | 'available' | 'unavailable' | 'blocked' | 'google-calendar'
 * @property {Object} data - Original booking/availability data
 * @property {number} height - Block height in pixels
 * @property {number} heightUnits - Proportional height (duration / 2 for 30-min base)
 * @property {Array<TimeSegment>} segments - For available blocks, 30-minute clickable segments
 */

/**
 * Time Segment Model (for available block precision)
 * @typedef {Object} TimeSegment
 * @property {number} startSlot - Segment start slot
 * @property {number} duration - Always 2 (30 minutes)
 * @property {number} offsetY - Y-position offset within parent block (for click detection)
 */

const BASE_HEIGHT = 40; // 40px = 30 minutes (1 height unit)

/**
 * Consolidates raw schedule data into continuous time blocks
 * Eliminates slot expansion - one block per event/gap
 * SPECIAL CASE: Available blocks maintain 30-minute segments for user selection
 * 
 * @param {Object} scheduleData - Schedule data keyed by slot number
 * @param {number} startSlot - Business hours start slot
 * @param {number} endSlot - Business hours end slot
 * @returns {Array<TimeBlock>} Sorted array of time blocks
 */
export function consolidateScheduleToBlocks(scheduleData, startSlot, endSlot) {
  const blocks = []
  
  let currentBlock = null
  let i = startSlot
  
  while (i < endSlot) {
    const slotData = scheduleData[i]
    
    // Treat empty objects or objects without a valid type as unavailable
    const isValidSlotData = slotData && typeof slotData === 'object' && slotData.type && slotData.type !== 'unavailable'
    
    if (!isValidSlotData) {
      // Handle unavailable slots
      if (currentBlock && currentBlock.type === 'unavailable') {
        // Extend current unavailable block
        currentBlock.duration += 2
      } else {
        // Start new unavailable block
        if (currentBlock) {
          finalizeBlock(currentBlock)
          blocks.push(currentBlock)
        }
        currentBlock = {
          id: `unavailable-${i}`,
          startSlot: i,
          duration: 2,
          type: 'unavailable',
          data: null
        }
      }
      i += 2 // Move to next 30-min slot
    } else {
      // Handle available, booked, or blocked slots
      const slotType = slotData.type
      const slotId = slotData.id || `${slotType}-${i}`
      
      if (currentBlock && currentBlock.type === slotType && canMergeBlocks(currentBlock, slotData, slotType)) {
        // Extend current block if same type and compatible - just add 1 slot (15 min)
        currentBlock.duration += 1
      } else {
        // Start new block (finalize and push previous block if exists)
        if (currentBlock) {
          finalizeBlock(currentBlock)
          blocks.push(currentBlock)
        }
        currentBlock = {
          id: slotId,
          startSlot: i,
          duration: 1, // Start with 1 slot (15 min)
          type: slotType,
          data: slotData
        }
      }
      
      // Always move forward by 1 slot (15 min) since data is now expanded
      i += 1
    }
  }
  
  // Add final block
  if (currentBlock) {
    finalizeBlock(currentBlock)
    blocks.push(currentBlock)
  }
  
  return blocks
}

/**
 * Determines if two consecutive slots can be merged into one block
 * Available blocks can merge, but booked/blocked/rescheduling blocks only merge if same booking
 */
function canMergeBlocks(currentBlock, slotData, slotType) {
  if (slotType === 'available') {
    return true // Always merge consecutive available slots
  }
  
  // For booked/blocked/rescheduling, only merge if same booking ID
  if (slotType === 'booked' || slotType === 'blocked' || slotType === 'google-calendar' || slotType === 'rescheduling') {
    return currentBlock.data?.id === slotData.id
  }
  
  return false
}

/**
 * Finalizes a block by calculating height and generating segments if needed
 * @param {TimeBlock} block - Block to finalize
 */
function finalizeBlock(block) {
  // Calculate height
  block.heightUnits = block.duration / 2 // 2 slots = 1 unit
  block.height = calculateBlockHeight(block.duration)
  
  // Generate segments for available blocks (for 30-minute precision)
  if (block.type === 'available') {
    block.segments = generateAvailableSegments(block.startSlot, block.duration, block.height)
  }
}

/**
 * Generates clickable 30-minute segments within an available time block
 * @param {number} startSlot - Block start slot
 * @param {number} duration - Block duration in slots
 * @param {number} blockHeight - Total block height in pixels
 * @returns {Array<TimeSegment>} Array of 30-minute segments with Y-offsets
 */
export function generateAvailableSegments(startSlot, duration, blockHeight) {
  const segments = []
  const segmentHeight = BASE_HEIGHT // 30 minutes = 40px
  
  for (let i = 0; i < duration; i += 2) { // 2 slots = 30 minutes
    segments.push({
      startSlot: startSlot + i,
      duration: 2,
      offsetY: (i / 2) * segmentHeight // Calculate Y-position
    })
  }
  
  return segments
}

/**
 * Calculates which segment was clicked based on Y-position
 * @param {number} clickY - Click Y-coordinate relative to block top
 * @param {Array<TimeSegment>} segments - Block's segments array
 * @returns {TimeSegment} The clicked segment
 */
export function getSegmentFromClickPosition(clickY, segments) {
  const segmentHeight = BASE_HEIGHT
  const segmentIndex = Math.floor(clickY / segmentHeight)
  return segments[Math.min(segmentIndex, segments.length - 1)]
}

/**
 * Calculates block height based on duration
 * Base height = 30 minutes (40px), scales proportionally
 * Subtracts 4px to account for vertical margins (2px top + 2px bottom)
 * @param {number} durationSlots - Duration in slots (2 = 30 min, 4 = 60 min)
 * @param {number} baseHeight - Base height for 30 minutes (default 40px)
 * @returns {number} Height in pixels (adjusted for margins)
 */
export function calculateBlockHeight(durationSlots, baseHeight = BASE_HEIGHT) {
  const VERTICAL_MARGIN = 4 // 2px top + 2px bottom margin
  return (durationSlots / 2) * baseHeight - VERTICAL_MARGIN
}
