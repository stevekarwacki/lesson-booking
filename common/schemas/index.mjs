/**
 * Central export for all validation schemas
 * 
 * Import schemas from this file for consistency:
 * 
 * Frontend: import { profileSchemaFlat } from '@common/schemas'
 * Backend:  import { profileSchemaNested } from './common/schemas/index.mjs'
 */

export { 
  profileSchemaFlat, 
  profileSchemaNested
} from './profile.schema.mjs'

export {
  smtpConfigSchema,
  smtpTestSchema
} from './smtp.schema.mjs'

// Future schemas will be exported here:
// export { signupSchema, loginSchema } from './auth.schema.mjs'
// export { passwordSchema } from './password.schema.mjs'

