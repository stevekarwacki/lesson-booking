/**
 * Constants Loader for Backend
 * 
 * Loads isomorphic constants from @common/ directory using dynamic import
 * This allows CommonJS backend code to use ES module constants
 */

let THEME_DEFAULTS = null
let BUSINESS_HOURS_DEFAULTS = null
let CURATED_PALETTES = null

// Load constants at module initialization
const constantsPromise = import('../common/constants/defaults.mjs')
  .then(constants => {
    THEME_DEFAULTS = constants.THEME_DEFAULTS
    BUSINESS_HOURS_DEFAULTS = constants.BUSINESS_HOURS_DEFAULTS
    CURATED_PALETTES = constants.CURATED_PALETTES
  })

/**
 * Get theme defaults (synchronous after initialization)
 * @returns {Object} Theme defaults
 */
function getThemeDefaults() {
  if (!THEME_DEFAULTS) {
    throw new Error('Constants not yet loaded. Ensure await ensureConstantsLoaded() before using.')
  }
  return THEME_DEFAULTS
}

/**
 * Get business hours defaults (synchronous after initialization)
 * @returns {Object} Business hours defaults
 */
function getBusinessHoursDefaults() {
  if (!BUSINESS_HOURS_DEFAULTS) {
    throw new Error('Constants not yet loaded. Ensure await ensureConstantsLoaded() before using.')
  }
  return BUSINESS_HOURS_DEFAULTS
}

/**
 * Get curated palettes (synchronous after initialization)
 * @returns {Array} Curated palettes
 */
function getCuratedPalettes() {
  if (!CURATED_PALETTES) {
    throw new Error('Constants not yet loaded. Ensure await ensureConstantsLoaded() before using.')
  }
  return CURATED_PALETTES
}

/**
 * Ensure constants are loaded before using them
 * Call this at server startup
 * @returns {Promise<void>}
 */
async function ensureConstantsLoaded() {
  await constantsPromise
}

module.exports = {
  getThemeDefaults,
  getBusinessHoursDefaults,
  getCuratedPalettes,
  ensureConstantsLoaded
}
