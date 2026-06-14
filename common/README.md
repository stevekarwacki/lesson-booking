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
import { profileSchema } from '@common/schemas/index.mjs'

// Validate form data before saving (format-only; all fields optional)
const result = profileSchema.safeParse(payload)

if (!result.success) {
  const errors = {}
  result.error.issues.forEach(issue => {
    errors[issue.path.join('.')] = issue.message
  })
  // Display errors in the form
} else {
  await saveProfile(payload)
}
```

### Backend (Node.js - Dynamic Import)

```javascript
// In utility file: Load schemas at module initialization
let profileSchema = null

const schemasPromise = import('../common/schemas/index.mjs')
  .then(schemas => {
    profileSchema = schemas.profileSchema
  })

// In route handler: Use validateProfileFields helper (preferred)
const validation = User.validateProfileFields(req.body)
if (!validation.valid) {
  return res.status(400).json({ error: 'Validation failed', errors: validation.errors })
}
```

**See `utils/verificationHelpers.js` for the complete validation helper implementation.**

## Available Schemas

- **`profile.schema.mjs`** — User profile validation
  - `profileSchema` — Format-only, all fields optional. Used for profile saves on both frontend and backend. Validates format when a field is present and non-empty; empty strings (clearing a field) pass cleanly.
- **`smtp.schema.mjs`** — SMTP configuration validation
- **Future**: Auth, password, payment schemas

## Validation Philosophy

### Two distinct validation layers

**`profileSchema` / `validateProfileFields`** — used at save time
- All fields are optional (partial saves are always allowed)
- If a field is provided and non-empty, its format is validated
- Empty string means "clear this field" — always accepted

**`isVerificationComplete(user)`** — used for profile completion CTAs only
- Checks whether a student has all required data stored
- Drives the "Complete your Profile" banner
- Has no effect on whether a save is allowed

This separation means users can save partial profiles at any time. The system then determines what they can do based on what's stored — not on what they just submitted.

### ✅ Belongs in Zod Schemas

- **Data format**: Phone numbers, emails, ZIP codes
- **Field relationships**: "If minor then parent_approval must be true"
- **Data types**: Strings, numbers, booleans

### ❌ Does NOT Belong in Zod Schemas

- **Completeness checks**: Whether all required fields are present
- **Business rules**: Credit calculations, pricing logic
- **Database queries**: Checking if email exists
- **Authorization**: Permission checks

## Error Handling

Zod provides two validation methods:

1. **`.parse()`** - Throws on validation error
2. **`.safeParse()`** - Returns result object (preferred)

```javascript
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

## Migration Status

- ✅ Profile validation (phone, address, minor status)
- ✅ Isomorphic architecture established
- ⏳ Auth validation (signup, login) - Planned
- ⏳ Password validation (strength, matching) - Planned
- ⏳ Payment validation - Planned
- ⏳ Credit validation - Planned
