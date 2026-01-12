# Common Validation Schemas

This directory contains **isomorphic validation schemas** that work in both:
- **Backend**: Node.js with CommonJS (`require`)
- **Frontend**: Vue with ES Modules (`import`)

## Purpose

Centralize validation logic to ensure consistency between frontend and backend validation, eliminating duplication and preventing validation drift.

## Technology

**[Zod](https://zod.dev/)** - TypeScript-first schema validation library
- Runtime validation
- Type inference
- Composable schemas
- Excellent error messages

## Usage

### Frontend (Vue - ES Modules)

```javascript
import { profileSchema } from '@/common/schemas/profile.schema.js'

// Validate data
const result = profileSchema.safeParse(data)

if (!result.success) {
  // Handle validation errors
  console.error(result.error.flatten())
} else {
  // Use validated data
  console.log(result.data)
}
```

### Backend (Node.js - CommonJS)

```javascript
const { profileSchema } = require('./common/schemas/profile.schema.js')

// Validate data (throws on error)
try {
  const validated = profileSchema.parse(req.body)
  // Use validated data
} catch (err) {
  res.status(400).json({ 
    error: 'Validation failed',
    details: err.flatten()
  })
}
```

## Dual Export Pattern

All schemas use a dual export pattern to work in both module systems:

```javascript
import { z } from 'zod'

export const mySchema = z.object({ /* ... */ })

// Dual export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mySchema }
}
```

## Available Schemas

- **`profile.schema.js`** - User profile/verification validation (phone, address, minor status)
- **`auth.schema.js`** - Authentication (signup, login)
- **`password.schema.js`** - Password validation and strength requirements

## Validation vs Business Logic

**This directory contains ONLY validation** (data shape/format checking).

**Business logic belongs elsewhere:**
- `utils/verificationHelpers.js` - Verification status, completion checks
- `utils/creditValidation.js` - Credit calculation logic
- Component files - UI transformation logic

## Error Handling

Zod provides two validation methods:

1. **`.parse()`** - Throws on validation error (use in backend)
2. **`.safeParse()`** - Returns result object (use in frontend)

```javascript
// Backend (throw errors)
const data = schema.parse(input)

// Frontend (handle gracefully)
const result = schema.safeParse(input)
if (!result.success) {
  // Display errors to user
}
```

## Adding New Schemas

1. Create `yourFeature.schema.js` in `/common/schemas/`
2. Define your schema using Zod
3. Use dual export pattern
4. Export from `index.js`
5. Import in both frontend and backend

## Migration Status

- ✅ Profile validation (phone, address, minor status)
- 🔄 Auth validation (signup, login) - In progress
- 🔄 Password validation - In progress
- ⏳ Payment validation - Planned
- ⏳ Credit validation - Planned

