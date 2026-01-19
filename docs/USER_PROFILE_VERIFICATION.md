# User Profile & Verification Feature

## Overview

The User Profile & Verification system ensures all students provide complete information before accessing the platform. This includes contact details, address, and minor status with parental approval.

## User Flow

### For Students

1. **Sign Up** → Create account with name, email, password
2. **Login** → Redirected to complete profile if incomplete
3. **Complete Profile** → Fill in phone, address, minor status
4. **Pending Approval** → Admin reviews and approves account
5. **Access Granted** → Full platform access

### For Admins/Instructors

- **No verification required** → Immediate access after signup
- **Can manage student profiles** → Edit/approve student data

## Data Model

### User Table Fields

```javascript
{
  // Basic Info (all users)
  name: STRING,
  email: STRING (unique),
  password: STRING (hashed),
  role: ENUM('student', 'instructor', 'admin'),
  
  // Profile Data (students only)
  phone_number: STRING,
  is_student_minor: BOOLEAN,
  user_profile_data: JSONB {
    address: {
      line_1: STRING,
      line_2: STRING | null,
      city: STRING,
      state: STRING (2 chars),
      zip: STRING (12345 or 12345-6789)
    },
    parent_approval: BOOLEAN  // Only if is_student_minor = true
  },
  
  // Metadata
  is_approved: BOOLEAN,
  profile_completed_at: TIMESTAMP
}
```

### Why JSONB for Address?

**Benefits:**
- ✅ Flexible structure (easy to add fields)
- ✅ Fewer migrations
- ✅ Single atomic update
- ✅ PostgreSQL supports indexing/querying JSONB

**Trade-offs:**
- ❌ Can't set foreign key on nested fields
- ❌ Slightly more complex queries

## Validation Rules

### Phone Number

```javascript
// Pattern
/^[+]?[\d\s\-()]+$/

// Valid Examples
555-123-4567
(555) 123-4567
+1 555 123 4567

// Invalid
abc-def-ghij
```

### Address

**Required Fields:**
- `line_1`: Street address (min 1 char)
- `city`: City name (min 1 char)
- `state`: 2-letter state code (exactly 2 chars)
- `zip`: ZIP code (5 digits or ZIP+4)

**Optional Fields:**
- `line_2`: Apartment, suite, etc.

### ZIP Code

```javascript
// Pattern
/^\d{5}(-\d{4})?$/

// Valid Examples
98101
98101-1234

// Invalid
123       // Too short
98101-    // Incomplete ZIP+4
ABCDE     // Not numeric
```

### Minor Status

**If `is_student_minor = true`:**
- **MUST** have `parent_approval = true`
- Validated on both frontend and backend

**If `is_student_minor = false`:**
- `parent_approval` is ignored

## Frontend Components

### Profile.vue

**Modes:**

#### 1. Normal Mode (User editing own profile)
```vue
<Profile />
```
- Shows all fields including password change
- Updates current user via `/api/users/me/verification`
- Shows "Complete Your Profile" header if incomplete

#### 2. Admin Mode (Admin editing user)
```vue
<Profile :user="selectedUser" admin-mode @profile-updated="handleUpdate" />
```
- Loads provided user's data
- Hides password fields
- Emits `profile-updated` event instead of API call
- No "Complete Your Profile" header

**Props:**
```javascript
{
  user: {
    type: Object,
    default: null  // If null, uses current user
  },
  adminMode: {
    type: Boolean,
    default: false
  }
}
```

**Emits:**
```javascript
{
  'profile-updated': {
    name: STRING,
    email: STRING,
    phone_number: STRING,
    is_student_minor: BOOLEAN,
    parent_approval: BOOLEAN,
    address: {
      line_1: STRING,
      line_2: STRING | null,
      city: STRING,
      state: STRING,
      zip: STRING
    }
  }
}
```

### ProfileStatusBanner.vue

Non-blocking banner shown to unapproved students:

```vue
<ProfileStatusBanner />
```

**States:**
- **Incomplete Profile**: "Complete your profile to access the platform"
- **Pending Approval**: "Your account is pending admin approval"
- **Approved**: No banner shown

**Location:** Mounted in `App.vue`, shown on all pages

## Backend Endpoints

### PUT /api/users/me/verification

**Purpose:** Student updates own profile

**Authentication:** Required (any authenticated user)

**Body:**
```json
{
  "phone_number": "555-123-4567",
  "is_student_minor": false,
  "address": {
    "line_1": "123 Main St",
    "line_2": null,
    "city": "Seattle",
    "state": "WA",
    "zip": "98101"
  }
}
```

**Response:**
```json
{
  "message": "Verification data updated successfully",
  "verification_status": {
    "complete": true,
    "approved": false,
    "needsVerification": false,
    "needsApproval": true,
    "canAccess": false
  }
}
```

**Validation:** Uses `profileSchemaNested` (Zod)

**Side Effects:**
- Sets `profile_completed_at` if complete for first time
- Builds nested profile data structure

### PUT /api/users/:userId/profile

**Purpose:** Admin updates any user's profile

**Authentication:** Required (admin only)

**Authorization:** `authorize('manage', 'User')`

**Body:**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "phone_number": "555-999-8888",
  "is_student_minor": false,
  "address": {
    "line_1": "456 Oak Ave",
    "line_2": "Apt 5B",
    "city": "Portland",
    "state": "OR",
    "zip": "97201"
  }
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "user": { /* full user object */ }
}
```

**Features:**
- Can update name and email
- Validates with Zod
- Sets `profile_completed_at` if needed
- Returns updated user object

## Helper Functions

### isVerificationComplete(user)

**Purpose:** Check if user has completed profile

**Returns:** `boolean`

**Logic:**
```javascript
// Admins/Instructors: Always complete
if (user.role === 'admin' || user.role === 'instructor') return true

// Students: Check all required fields
const hasPhone = !!user.phone_number
const hasAddress = user.user_profile_data?.address?.line_1 
                && user.user_profile_data.address.city 
                && user.user_profile_data.address.state 
                && user.user_profile_data.address.zip
const hasMinorStatus = user.is_student_minor !== null

if (!hasPhone || !hasAddress || !hasMinorStatus) return false

// If minor, must have parent approval
if (user.is_student_minor && !user.user_profile_data.parent_approval) {
  return false
}

return true
```

### getVerificationStatus(user)

**Purpose:** Get detailed verification status

**Returns:**
```javascript
{
  complete: boolean,      // Profile is complete
  approved: boolean,      // Account is approved
  needsVerification: boolean,  // Needs to complete profile
  needsApproval: boolean,      // Needs admin approval
  canAccess: boolean      // Can access platform
}
```

**Logic:**
```javascript
const complete = isVerificationComplete(user)
const approved = user.is_approved === true

return {
  complete,
  approved,
  needsVerification: !complete && user.role === 'student',
  needsApproval: complete && !approved,
  canAccess: (user.role !== 'student') || (complete && approved)
}
```

### buildProfileData(data)

**Purpose:** Transform flat form data to nested structure

**Input:**
```javascript
{
  address_line_1: '123 Main St',
  address_line_2: 'Apt 4',
  city: 'Seattle',
  state: 'WA',
  zip: '98101',
  is_minor: false
}
```

**Output:**
```javascript
{
  address: {
    line_1: '123 Main St',
    line_2: 'Apt 4',
    city: 'Seattle',
    state: 'WA',
    zip: '98101'
  }
}
```

**Note:** Only includes `parent_approval` if `is_minor = true`

## User States

```
┌─────────────┐
│   Sign Up   │
└──────┬──────┘
       │
       v
┌─────────────────────┐
│ Incomplete Profile  │ ← needsVerification: true
│ (no phone/address)  │
└──────┬──────────────┘
       │ Fills profile
       v
┌─────────────────────┐
│ Pending Approval    │ ← needsApproval: true
│ (complete, not      │
│  approved)          │
└──────┬──────────────┘
       │ Admin approves
       v
┌─────────────────────┐
│ Approved Student    │ ← canAccess: true
│ (full access)       │
└─────────────────────┘
```

## Admin Workflows

### Approving Students

1. Navigate to **User Management**
2. Find student with "Pending Approval" badge
3. Click to open **UserManager** modal
4. Review profile data in **Profile** tab
5. Go to **Account** tab
6. Toggle **Account Approved**
7. Save

### Editing Student Profiles

1. Open student in **UserManager** modal
2. Go to **Profile** tab
3. Edit any field (name, email, phone, address, minor status)
4. Click **Update Profile**
5. Changes saved immediately

### Bulk Actions

**Not yet implemented** - Future enhancement ideas:
- Approve multiple students at once
- Export student contact info
- Send email to all pending approvals

## Testing

### Backend Tests

**Location:** `/tests/profile-validation.test.js`, `/tests/profile-api.test.js`

```bash
npm run test:backend
```

**Coverage:**
- ✅ Zod schema validation (32 tests)
- ✅ Profile data persistence (13 tests)
- ✅ Admin editing workflows
- ✅ Completion checks
- ✅ Minor/parent approval logic

### Frontend Tests

**Location:** `/frontend/src/tests/Profile.test.js`

```bash
cd frontend && npm run test:run
```

**Coverage:**
- Profile component (normal mode)
- Profile component (admin mode)
- Validation logic
- Minor status handling

### Manual Testing Checklist

**Student Flow:**
- [ ] Sign up as new student
- [ ] Login redirects to Profile page if incomplete
- [ ] Fill all required fields
- [ ] Submit → See "Pending Approval" banner
- [ ] Try to book lesson → Blocked
- [ ] Admin approves → Full access granted

**Admin Flow:**
- [ ] Open student in UserManager
- [ ] Edit name in Profile tab
- [ ] Edit phone number
- [ ] Change address
- [ ] Toggle minor status
- [ ] Save → Changes persist
- [ ] Refresh page → Changes still there

**Validation:**
- [ ] Submit with empty phone → Error shown
- [ ] Submit with invalid ZIP (123) → Error shown
- [ ] Mark as minor without approval → Error shown
- [ ] Fill valid data → Submission succeeds

## Security Considerations

### Authorization

- ✅ Students can only edit **own** profile
- ✅ Admins can edit **any** profile
- ✅ Instructors **cannot** edit student profiles (unless also admin)
- ✅ Profile endpoint checks CASL permissions

### Data Validation

- ✅ Backend validates **all** data with Zod
- ✅ Frontend validation is **not trusted** (UX only)
- ✅ SQL injection protected by Sequelize ORM
- ✅ XSS protected by Vue's auto-escaping

### Privacy

- 📧 Email visible only to user and admins
- 📞 Phone visible only to user and admins
- 🏠 Address visible only to user and admins
- ⚠️ **Future:** Consider GDPR compliance if serving EU users

## Future Enhancements

### Email Notifications

**Admin Alerts:**
- Student completes profile → Email admin
- New signup → Email admin

**Student Alerts:**
- Account approved → Email student
- Profile updated by admin → Email student

### Audit Logging

Track profile changes:
```javascript
{
  user_id: 123,
  changed_by: 456,  // Admin user ID
  field: 'phone_number',
  old_value: '555-111-1111',
  new_value: '555-222-2222',
  changed_at: '2026-01-12T10:30:00Z'
}
```

### Document Uploads

Allow students to upload:
- ID verification
- Parent consent form (for minors)
- Proof of address

### Multi-Language Support

- Translate validation messages
- Support international phone formats
- Handle non-US addresses

## Troubleshooting

### "Profile not saving"

**Symptoms:** Click "Update Profile" but data reverts

**Causes:**
1. Validation failing silently
2. Missing token
3. Network error

**Debug:**
```javascript
// Check browser console for errors
// Check Network tab for failed requests
// Check backend logs for validation errors
```

### "Stuck on pending approval"

**Symptoms:** Profile complete but can't access platform

**Solution:**
- Admin must approve in UserManager → Account tab
- Check `is_approved` field in database

### "Parent approval not working"

**Symptoms:** Can't submit as minor

**Check:**
- [ ] `is_student_minor` checkbox is checked
- [ ] Parent approval checkbox is checked
- [ ] Both checkboxes are checked **before** submit

## Migration Notes

### From Old System

If you had a previous verification system:

```sql
-- Update old data to new structure
UPDATE users 
SET user_profile_data = jsonb_build_object(
  'address', jsonb_build_object(
    'line_1', old_address_line_1,
    'line_2', old_address_line_2,
    'city', old_city,
    'state', old_state,
    'zip', old_zip
  )
)
WHERE role = 'student';
```

### Adding New Fields

To add a new profile field:

1. Update Zod schema in `/common/schemas/profile.schema.mjs`
2. Add migration (if not using JSONB)
3. Update `Profile.vue` form
4. Update `isVerificationComplete()` if required field
5. Update tests
6. Update this documentation

## Resources

- **Component**: `/frontend/src/components/Profile.vue`
- **Schemas**: `/common/schemas/profile.schema.mjs`
- **Helpers**: `/utils/verificationHelpers.js`
- **Routes**: `/routes/users.js`
- **Tests**: `/tests/profile-*.test.js`
- **Zod Guide**: `docs/ZOD_INTEGRATION_GUIDE.md`


