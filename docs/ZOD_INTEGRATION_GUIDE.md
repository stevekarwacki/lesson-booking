# Zod Integration & Isomorphic Validation Guide

## Overview

This application uses **Zod** for schema-based validation that works identically on both the frontend (Vue) and backend (Node.js/Express). This ensures validation consistency and eliminates code duplication.

## Architecture

### The `/common` Directory

All shared validation schemas live in `/common/schemas/`:

```
/common
├── README.md
└── schemas
    ├── index.mjs
    └── profile.schema.mjs
```

### ES Modules (.mjs)

We use `.mjs` files because:
- **Frontend**: Vite natively supports ES modules (`import`)
- **Backend**: Node.js CommonJS can dynamically import ES modules (`await import()`)
- **Single Source**: One file works in both environments

## Using Zod Schemas

### Frontend (Vue Components)

```javascript
import { profileSchemaFlat } from '@common/schemas'

// Validate form data
const result = profileSchemaFlat.safeParse(formData)

if (!result.success) {
  // Handle validation errors
  const errors = {}
  result.error.issues.forEach(issue => {
    errors[issue.path.join('.')] = issue.message
  })
  console.error(errors)
} else {
  // Use validated data
  await submitForm(result.data)
}
```

**Key Points:**
- Use `.safeParse()` for non-throwing validation
- Errors are structured and user-friendly
- Data is automatically trimmed/transformed per schema

### Backend (Node.js/Express)

```javascript
// Load schemas dynamically (once at startup)
let profileSchemaNested
async function initSchemas() {
  const schemas = await import('../common/schemas/index.mjs')
  profileSchemaNested = schemas.profileSchemaNested
}
await initSchemas()

// In route handler
router.put('/profile', async (req, res) => {
  try {
    // .parse() throws on validation error
    const validated = profileSchemaNested.parse(req.body)
    
    // Use validated data
    await updateUserProfile(validated)
    res.json({ success: true })
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: err.flatten()
      })
    }
    throw err
  }
})
```

**Key Points:**
- Use `await import()` to load ES modules in CommonJS
- Use `.parse()` to throw on error (good for APIs)
- Catch `ZodError` specifically for validation errors

## Schema Structure

### Profile Schema (Flat)

Used by frontend forms where data is flat:

```javascript
const profileSchemaFlat = z.object({
  phone_number: z.string().trim().min(1).regex(/^[+]?[\d\s\-()]+$/),
  address_line_1: z.string().trim().min(1),
  address_line_2: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().min(1),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/),
  is_minor: z.boolean(),
  parent_approval: z.boolean().optional()
}).refine(
  (data) => !data.is_minor || data.parent_approval === true,
  { message: 'Parent approval is required for minors', path: ['parent_approval'] }
)
```

### Profile Schema (Nested)

Used by backend where data is nested (address as JSON):

```javascript
const profileSchemaNested = z.object({
  phone_number: z.string().trim().min(1).regex(/^[+]?[\d\s\-()]+$/),
  is_student_minor: z.boolean(),
  parent_approval: z.boolean().optional(),
  address: z.object({
    line_1: z.string().trim().min(1),
    line_2: z.string().trim().optional().nullable(),
    city: z.string().trim().min(1),
    state: z.string().trim().length(2),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/)
  })
}).refine(
  (data) => !data.is_student_minor || data.parent_approval === true,
  { message: 'Parent approval is required for minors', path: ['parent_approval'] }
)
```

## Validation Features

### Automatic Transformations

Zod automatically applies transformations:

```javascript
z.string().trim()  // Removes leading/trailing whitespace
z.string().toLowerCase()  // Converts to lowercase
z.string().optional()  // Makes field optional
```

### Custom Refinements

Add complex validation rules:

```javascript
.refine(
  (data) => data.is_minor === false || data.parent_approval === true,
  {
    message: 'Minors require parent approval',
    path: ['parent_approval']  // Where to attach error
  }
)
```

### Error Messages

Customize error messages:

```javascript
z.string().min(1, 'Phone number is required')
z.string().regex(/^\d{5}$/, 'ZIP code must be 5 digits')
```

## Adding New Schemas

### 1. Create Schema File

`/common/schemas/payment.schema.mjs`:

```javascript
import { z } from 'zod'

export const paymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['card', 'in-person']),
  card_last4: z.string().length(4).optional()
}).refine(
  (data) => data.method !== 'card' || data.card_last4,
  { message: 'Card payments require card_last4', path: ['card_last4'] }
)
```

### 2. Export from Index

`/common/schemas/index.mjs`:

```javascript
export { paymentSchema } from './payment.schema.mjs'
export { profileSchemaFlat, profileSchemaNested } from './profile.schema.mjs'
```

### 3. Use in Frontend

```javascript
import { paymentSchema } from '@common/schemas'

const result = paymentSchema.safeParse(paymentData)
```

### 4. Use in Backend

```javascript
let paymentSchema
async function initSchemas() {
  const schemas = await import('../common/schemas/index.mjs')
  paymentSchema = schemas.paymentSchema
}
```

## Validation vs Business Logic

### ✅ Belongs in Zod Schemas

- **Data format**: Phone numbers, emails, ZIP codes
- **Required fields**: Non-null constraints
- **Field relationships**: "If A then B must exist"
- **Data types**: Strings, numbers, booleans

### ❌ Does NOT Belong in Zod Schemas

- **Business rules**: Credit calculations, pricing logic
- **Database queries**: Checking if email exists
- **Authorization**: Permission checks
- **Complex state**: Multi-step workflows

Put business logic in:
- `utils/` helpers (e.g., `creditValidation.js`)
- Model static methods (e.g., `User.hasEnoughCredits()`)
- Middleware (e.g., `authorize()`)

## Error Handling

### Frontend Pattern

```javascript
const result = schema.safeParse(data)

if (!result.success) {
  const fieldErrors = {}
  result.error.issues.forEach(issue => {
    const fieldName = issue.path.join('.')
    fieldErrors[fieldName] = issue.message
  })
  
  // Display errors next to form fields
  setErrors(fieldErrors)
}
```

### Backend Pattern

```javascript
try {
  const validated = schema.parse(data)
  // Process validated data
} catch (err) {
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      errors: err.flatten().fieldErrors
    })
  }
  // Handle other errors
  throw err
}
```

## Testing Zod Schemas

### Unit Tests

```javascript
const { profileSchemaFlat } = await import('../common/schemas/index.mjs')

describe('Profile Schema', () => {
  it('should validate correct data', () => {
    const result = profileSchemaFlat.safeParse({
      phone_number: '555-123-4567',
      address_line_1: '123 Main St',
      city: 'Seattle',
      state: 'WA',
      zip: '98101',
      is_minor: false
    })
    
    assert.strictEqual(result.success, true)
  })
  
  it('should reject invalid phone', () => {
    const result = profileSchemaFlat.safeParse({
      phone_number: 'not-a-phone',
      // ... other fields
    })
    
    assert.strictEqual(result.success, false)
    assert.ok(result.error.issues.some(i => i.path.includes('phone_number')))
  })
})
```

## Migration Strategy

When moving from manual validation to Zod:

1. ✅ **Create Zod schema** matching existing validation
2. ✅ **Write tests** for the schema
3. ✅ **Replace frontend validation** (safeParse)
4. ✅ **Replace backend validation** (parse)
5. ✅ **Remove old validation code**
6. ✅ **Update documentation**

## Benefits

### Before Zod

```javascript
// Frontend (Vue)
if (!phone_number || !phone_number.trim()) {
  errors.phone_number = 'Phone is required'
} else if (!/^[+]?[\d\s\-()]+$/.test(phone_number)) {
  errors.phone_number = 'Invalid phone format'
}

// Backend (Node)
if (!phone_number || !phone_number.trim()) {
  return res.status(400).json({ error: 'Phone is required' })
}
if (!/^[+]?[\d\s\-()]+$/.test(phone_number)) {
  return res.status(400).json({ error: 'Invalid phone format' })
}
```

**Problems:**
- 🔴 Duplicated logic (2 places)
- 🔴 Different error messages
- 🔴 Easy to drift out of sync
- 🔴 No type safety

### After Zod

```javascript
// Shared schema
export const phoneValidator = z.string()
  .trim()
  .min(1, 'Phone is required')
  .regex(/^[+]?[\d\s\-()]+$/, 'Invalid phone format')

// Frontend
const result = schema.safeParse(data)

// Backend
const validated = schema.parse(data)
```

**Benefits:**
- ✅ **Single source of truth**
- ✅ **Consistent errors**
- ✅ **Automatic sync**
- ✅ **Type inference**
- ✅ **Less code** (reduced by ~60%)

## Troubleshooting

### "Cannot use import statement outside a module"

**Problem:** Node.js trying to `require()` an ES module

**Solution:** Use dynamic import:
```javascript
const schemas = await import('../common/schemas/index.mjs')
```

### "Module not found: @common/schemas"

**Problem:** Vite can't resolve alias

**Solution:** Add to `vite.config.js`:
```javascript
resolve: {
  alias: {
    '@common': fileURLToPath(new URL('../common', import.meta.url))
  }
}
```

### "profileSchema is undefined"

**Problem:** Schema not loaded before use

**Solution:** Ensure init function completes:
```javascript
let schema
async function initSchemas() {
  const s = await import('../common/schemas/index.mjs')
  schema = s.profileSchemaFlat
}
await initSchemas()  // Must await!
```

## Resources

- **Zod Documentation**: https://zod.dev
- **Schema Location**: `/common/schemas/`
- **Test Examples**: `/tests/profile-validation.test.js`
- **Common README**: `/common/README.md`


