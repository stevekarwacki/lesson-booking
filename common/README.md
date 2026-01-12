# Common Validation Schemas

This directory contains **truly isomorphic validation schemas** using ES modules (`.mjs`) that work in both:
- **Backend**: Node.js (dynamic `import()` from CommonJS)
- **Frontend**: Vue (static `import` via Vite)

## Purpose

**Single source of truth** for validation logic. Same code, same schemas, same error messages on both frontend and backend. No duplication, no drift.

## Technology

**[Zod](https://zod.dev/)** - TypeScript-first schema validation library
- Runtime validation
- Type inference
- Composable schemas
- Excellent error messages
- Works with both TypeScript and JavaScript

## Architecture

**ES Modules Only** (`.mjs` files)
- Single `.mjs` file per schema
- Frontend imports directly via Vite
- Backend uses dynamic `import()` at startup
- No code duplication

## Usage

### Frontend (Vue - ES Modules)

```javascript
import { profileSchemaFlat } from '@common/schemas/index.mjs'

// Validate user input (returns result object)
const result = profileSchemaFlat.safeParse({
  phone_number: '555-123-4567',
  address_line_1: '123 Main St',
  address_line_2: '',
  city: 'Seattle',
  state: 'WA',
  zip: '98101',
  is_minor: false
})

if (!result.success) {
  // Handle validation errors
  result.error.issues.forEach(issue => {
    console.log(`${issue.path.join('.')}: ${issue.message}`)
  })
} else {
  // Use validated data
  console.log('Valid!', result.data)
}
```

### Backend (Node.js - Dynamic Import)

```javascript
// In utility file: Load schemas at module initialization
let profileSchemaNested = null

const schemasPromise = import('../common/schemas/index.mjs')
  .then(schemas => {
    profileSchemaNested = schemas.profileSchemaNested
  })

// In route handler: Use schemas (already loaded)
const result = profileSchemaNested.safeParse(req.body)

if (!result.success) {
  return res.status(400).json({ 
    error: 'Validation failed',
    errors: result.error.issues
  })
}
```

**See `utils/verificationHelpers.js` for a complete example.**

## Available Schemas

- **`profile.schema.mjs`** - User profile validation
  - `profileSchemaFlat` - For frontend forms (flat structure)
  - `profileSchemaNested` - For backend API (nested address object)
- **Future**: Auth, password, payment schemas

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

1. **Create** `yourFeature.schema.mjs` in `/common/schemas/`
   ```javascript
   import { z } from 'zod'
   
   export const yourSchema = z.object({
     field: z.string().min(1, 'Required')
   })
   ```

2. **Export** from `/common/schemas/index.mjs`
   ```javascript
   export { yourSchema } from './yourFeature.schema.mjs'
   ```

3. **Use in Frontend**
   ```javascript
   import { yourSchema } from '@common/schemas/index.mjs'
   ```

4. **Use in Backend** (dynamic import at startup)
   ```javascript
   let yourSchema = null
   import('../common/schemas/index.mjs').then(s => yourSchema = s.yourSchema)
   ```

## Why .mjs Files?

**Problem**: Backend uses CommonJS, frontend uses ES modules. They're incompatible.

**Solution**: ES modules (`.mjs`) can be imported by both:
- ✅ Frontend: Native ES module support via Vite
- ✅ Backend: Dynamic `import()` works from CommonJS

**Alternative** would require duplicating schemas in `.cjs` and `.mjs` files, defeating the purpose of isomorphic code.

## Migration Status

- ✅ Profile validation (phone, address, minor status)
- ✅ Isomorphic architecture established
- ⏳ Auth validation (signup, login) - Planned
- ⏳ Password validation (strength, matching) - Planned  
- ⏳ Payment validation - Planned
- ⏳ Credit validation - Planned

