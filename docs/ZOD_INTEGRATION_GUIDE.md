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
import { profileSchema } from '@common/schemas'

// Validate form data before saving (format-only; all fields optional)
const result = profileSchema.safeParse(payload)

if (!result.success) {
  // Handle validation errors
  const errors = {}
  result.error.issues.forEach(issue => {
    errors[issue.path.join('.')] = issue.message
  })
  fieldErrors.value = errors
} else {
  await submitForm(payload)
}
```

**Key Points:**
- Use `.safeParse()` for non-throwing validation
- Errors are structured and user-friendly
- Data is automatically trimmed/transformed per schema

### Backend (Node.js/Express)

The preferred pattern is to use the `validateProfileFields` helper rather than calling the schema directly:

```javascript
// In route handler
router.put('/profile', async (req, res) => {
  const validation = User.validateProfileFields(req.body)
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Validation failed',
      errors: validation.errors
    })
  }
  await updateUserProfile(req.body)
  res.json({ success: true })
})
```

If you need to use the schema directly (e.g. in a new helper):

```javascript
// Load schemas dynamically (once at startup)
let profileSchema
async function initSchemas() {
  const schemas = await import('../common/schemas/index.mjs')
  profileSchema = schemas.profileSchema
}
await initSchemas()

// In route handler
router.put('/profile', async (req, res) => {
  const result = profileSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      errors: result.error.flatten().fieldErrors
    })
  }
  await updateUserProfile(req.body)
  res.json({ success: true })
})
```

**Key Points:**
- Use `await import()` to load ES modules in CommonJS
- Use `.parse()` to throw on error (good for APIs)
- Catch `ZodError` specifically for validation errors

## Schema Structure

### Profile Schema

One schema handles both frontend and backend. All fields are optional — if a field is present and non-empty its format is validated; empty strings are accepted (they clear the stored value).

```javascript
const profileSchema = z.object({
  email: optionalFormat(z.string().email('Invalid email address')),
  phone_number: optionalFormat(
    z.string().trim().regex(/^[+]?[\d\s\-()]+$/, 'Invalid phone number format')
  ),
  is_student_minor: z.boolean().optional(),
  parent_approval: z.boolean().optional(),
  address: z.object({
    line_1: z.string().optional(),
    line_2: z.string().nullable().optional(),
    city: z.string().optional(),
    state: optionalFormat(z.string().length(2, 'State must be a 2-letter code')),
    zip: optionalFormat(z.string().regex(/^\d{5}(-\d{4})?$/))
  }).optional()
}).refine(
  (data) => data.is_student_minor !== true || data.parent_approval === true,
  { message: 'Parent approval is required for minors', path: ['parent_approval'] }
)
```

The `optionalFormat` helper means three states are valid for any format-checked field:
- `undefined` — field not sent — passes
- `''` — field cleared — passes
- `'555-1234'` — non-empty value — format validated

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
export { profileSchema } from './profile.schema.mjs'
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
- **Field relationships**: "If minor then parent_approval must be true"
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
const { profileSchema } = await import('../common/schemas/index.mjs')

describe('Profile Schema', () => {
  it('should pass with no fields (partial save)', () => {
    const result = profileSchema.safeParse({})
    assert.strictEqual(result.success, true)
  })

  it('should reject invalid phone when provided', () => {
    const result = profileSchema.safeParse({ phone_number: 'not-a-phone' })
    assert.strictEqual(result.success, false)
    assert.ok(result.error.issues.some(i => i.path.includes('phone_number')))
  })

  it('should accept empty phone (field cleared)', () => {
    const result = profileSchema.safeParse({ phone_number: '' })
    assert.strictEqual(result.success, true)
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
  schema = s.profileSchema
}
await initSchemas()  // Must await!
```

## Resources

- **Zod Documentation**: https://zod.dev
- **Schema Location**: `/common/schemas/`
- **Test Examples**: `/tests/profile-validation.test.js`
- **Common README**: `/common/README.md`


