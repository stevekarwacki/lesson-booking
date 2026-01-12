/**
 * Central export for all validation schemas
 * 
 * Import schemas from this file for consistency:
 * 
 * Frontend: import { profileSchemaFlat } from '@common/schemas'
 * Backend:  const { profileSchemaNested } = require('./common/schemas')
 */

const profileSchemas = require('./profile.schema.js')

// Export all schemas
module.exports = {
  ...profileSchemas
  // Future schemas will be added here:
  // ...authSchemas,
  // ...passwordSchemas
}

