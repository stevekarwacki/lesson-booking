/**
 * Profile Validation Schemas
 * 
 * Isomorphic validation for user profile data including phone, address, and minor status.
 * These schemas work in both Node.js (backend) and Vue (frontend).
 */

const { z } = require('zod')

// Reusable field validators
const phoneNumberValidator = z.string()
  .trim()
  .min(1, 'Phone number is required')
  .regex(/^[+]?[\d\s\-()]+$/, 'Invalid phone number format')

const zipCodeValidator = z.string()
  .trim()
  .regex(/^\d{5}(-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789')

// Flat structure (used by frontend components)
const profileSchemaFlat = z.object({
  phone_number: phoneNumberValidator,
  address_line_1: z.string().trim().min(1, 'Address is required'),
  address_line_2: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().length(2, 'State is required'),
  zip: zipCodeValidator,
  is_minor: z.boolean(),
  parent_approval: z.boolean().optional()
}).refine(
  (data) => !data.is_minor || data.parent_approval === true,
  {
    message: 'Parent approval is required for minors',
    path: ['parent_approval']
  }
)

// Nested structure (used by backend API - expects address object)
const profileSchemaNested = z.object({
  phone_number: phoneNumberValidator,
  is_student_minor: z.boolean(),
  parent_approval: z.boolean().optional(),
  address: z.object({
    line_1: z.string().trim().min(1, 'Address is required'),
    line_2: z.string().trim().optional().nullable(),
    city: z.string().trim().min(1, 'City is required'),
    state: z.string().trim().length(2, 'State is required'),
    zip: zipCodeValidator
  })
}).refine(
  (data) => !data.is_student_minor || data.parent_approval === true,
  {
    message: 'Parent approval is required for minors',
    path: ['parent_approval']
  }
)

// Helper: Transform Zod errors to simple field errors object
function zodErrorsToFieldErrors(zodError) {
  const fieldErrors = {}
  
  zodError.issues.forEach(issue => {
    const path = issue.path.join('.')
    fieldErrors[path] = issue.message
  })
  
  return fieldErrors
}

// CommonJS export
module.exports = {
  profileSchemaFlat,
  profileSchemaNested,
  zodErrorsToFieldErrors
}

