/**
 * Profile Validation Schemas
 *
 * Isomorphic validation for user profile data including phone, address, and minor status.
 * These schemas work in both Node.js (backend) and Vue (frontend).
 */

import { z } from 'zod'

// Reusable field validators
const phoneNumberValidator = z.string()
  .trim()
  .regex(/^[+]?[\d\s\-()]+$/, 'Invalid phone number format')

const zipCodeValidator = z.string()
  .trim()
  .regex(/^\d{5}(-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789')

// Accepts undefined (field omitted), '' (field cleared), or a non-empty value
// that passes the given validator.
const optionalFormat = (validator) =>
  z.union([z.literal(''), validator]).optional()

/**
 * Profile schema — used for all profile SAVE routes.
 *
 * All fields are optional. If a field is present and non-empty its format is
 * validated. Empty strings are allowed (they clear the stored value).
 * Does NOT enforce completeness — that is isVerificationComplete's job.
 */
export const profileSchema = z.object({
  email: optionalFormat(z.string().email('Invalid email address')),
  phone_number: optionalFormat(phoneNumberValidator),
  is_student_minor: z.boolean().optional(),
  parent_approval: z.boolean().optional(),
  address: z.object({
    line_1: z.string().optional(),
    line_2: z.string().nullable().optional(),
    city: z.string().optional(),
    state: optionalFormat(z.string().length(2, 'State must be a 2-letter code')),
    zip: optionalFormat(zipCodeValidator)
  }).optional()
}).refine(
  (data) => data.is_student_minor !== true || data.parent_approval === true,
  { message: 'Parent approval is required for minors', path: ['parent_approval'] }
)
