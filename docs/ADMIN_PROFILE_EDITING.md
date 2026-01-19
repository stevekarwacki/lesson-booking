# Admin Profile Editing Guide

## Overview

Admins can view and edit any user's profile information through the User Management interface. This allows admins to correct errors, update contact information, and manage student data efficiently.

## Access & Permissions

### Who Can Edit Profiles?

**✅ Admins:**
- Can edit **any** user's profile
- Can update name, email, phone, address, minor status
- Access via UserManager modal

**❌ Instructors:**
- Cannot edit student profiles
- Can only view limited student info in calendar

**❌ Students:**
- Can only edit their **own** profile
- Cannot edit other students

### CASL Authorization

```javascript
// Backend route protection
router.put('/api/users/:userId/profile', 
  authorize('manage', 'User'),  // Requires admin
  async (req, res) => {
    // ... update logic
  }
)

// Frontend permission check
const userStore = useUserStore()
if (userStore.canManageUsers) {
  // Show edit button
}
```

## User Interface

### UserManager Modal Structure

```
┌─────────────────────────────────────────┐
│  Edit User: John Doe                     │
├─────────────────────────────────────────┤
│  [Profile] [Account] [Bookings] [...]   │
├─────────────────────────────────────────┤
│                                          │
│  Profile Tab:                            │
│  ┌────────────────────────────────────┐ │
│  │ <Profile /> component              │ │
│  │ - Name field                       │ │
│  │ - Email field                      │ │
│  │ - Phone field                      │ │
│  │ - Address fields                   │ │
│  │ - Minor status checkbox            │ │
│  │ [Update Profile]                   │ │
│  └────────────────────────────────────┘ │
│                                          │
└─────────────────────────────────────────┘
```

### Tab Organization

1. **Profile** (Students only)
   - Full profile form (reuses `Profile.vue`)
   - Name, email, phone, address, minor status
   
2. **Account** (All users)
   - Account approval toggle
   - Role management
   - In-Person Payment override
   - Delete user (danger zone)

3. **Bookings** (Students only)
   - Upcoming lessons
   - Past lessons
   - Attendance history

4. **Credits** (Students only)
   - Current balance
   - Transaction history
   - Manual adjustments

## Editing Workflow

### Step-by-Step

1. **Open User Management**
   ```
   Admin Dashboard → User Management
   ```

2. **Find User**
   ```
   - Use search bar to filter by name/email
   - Click on user row
   ```

3. **Edit Profile**
   ```
   - Profile tab opens by default (for students)
   - Modify any field
   - Click "Update Profile"
   ```

4. **Confirmation**
   ```
   - Success toast appears
   - Modal stays open
   - Data is immediately persisted
   ```

### Keyboard Shortcuts

- `Esc` - Close modal
- `Tab` - Navigate between fields
- `Enter` - Submit form (when in input field)

## Profile Component Integration

### Normal Mode vs Admin Mode

The `Profile.vue` component supports two modes:

#### Normal Mode (Student editing own profile)

```vue
<Profile />
```

**Behavior:**
- Loads current user from `useUserStore()`
- Shows password change section
- Makes API call to `/api/users/me/verification`
- Shows "Complete Your Profile" header if incomplete

#### Admin Mode (Admin editing another user)

```vue
<Profile 
  :user="editingUser" 
  admin-mode 
  @profile-updated="handleProfileUpdate" 
/>
```

**Behavior:**
- Loads provided `user` prop
- Hides password section (admins can't change passwords)
- Emits `profile-updated` event instead of API call
- Hides "Complete Your Profile" header
- Parent component handles API call

### Implementation in UserManager

```javascript
// UserManager.vue
<template>
  <TabbedModal :show="showEditModal" @close="closeEditModal">
    <TabbedModalTab 
      v-if="isStudent" 
      label="Profile" 
      default
    >
      <Profile 
        :user="editingUser" 
        admin-mode 
        @profile-updated="handleProfileUpdate" 
      />
    </TabbedModalTab>
  </TabbedModal>
</template>

<script setup>
import { useUserManagement } from '../composables/useUserManagement'

const { 
  updateUserProfile,
  isUpdatingUserProfile 
} = useUserManagement()

const handleProfileUpdate = async (updatedData) => {
  try {
    await updateUserProfile({
      userId: editingUser.value.id,
      profileData: updatedData
    })
    showSuccess('Profile updated successfully!')
  } catch (err) {
    showError('Error: ' + err.message)
  }
}
</script>
```

## Backend API

### PUT /api/users/:userId/profile

**Endpoint:** `/api/users/:userId/profile`

**Method:** `PUT`

**Auth:** Required (admin only)

**Authorization:** CASL `manage User`

**Request Body:**

```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "phone_number": "555-999-8888",
  "is_student_minor": false,
  "parent_approval": null,  // Only for minors
  "address": {
    "line_1": "456 Oak Ave",
    "line_2": "Apt 5B",
    "city": "Portland",
    "state": "OR",
    "zip": "97201"
  }
}
```

**Validation:**

```javascript
// Uses Zod schema validation
const validation = User.validateVerificationData({
  phone_number,
  is_student_minor,
  parent_approval,
  address
})

if (!validation.valid) {
  return res.status(400).json({
    error: 'Validation failed',
    errors: validation.errors
  })
}
```

**Response (Success):**

```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 123,
    "name": "Updated Name",
    "email": "newemail@example.com",
    "phone_number": "555-999-8888",
    "is_student_minor": false,
    "user_profile_data": {
      "address": {
        "line_1": "456 Oak Ave",
        "line_2": "Apt 5B",
        "city": "Portland",
        "state": "OR",
        "zip": "97201"
      }
    },
    "profile_completed_at": "2026-01-12T10:30:00.000Z",
    // ... other user fields
  }
}
```

**Response (Validation Error):**

```json
{
  "error": "Validation failed",
  "errors": {
    "phone_number": "Invalid phone number format",
    "zip": "ZIP code must be in format 12345 or 12345-6789"
  }
}
```

### Route Implementation

```javascript
// routes/users.js
router.put('/:userId/profile', authorize('manage', 'User'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10)
    const { name, email, phone_number, is_student_minor, parent_approval, address } = req.body

    // Validate with Zod
    const validation = User.validateVerificationData({
      phone_number,
      is_student_minor,
      parent_approval,
      address
    })

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validation.errors
      })
    }

    // Build update object
    const updates = {
      name,
      email,
      phone_number: phone_number?.trim(),
      is_student_minor,
      user_profile_data: User.buildProfileData({
        address_line_1: address?.line_1,
        address_line_2: address?.line_2,
        city: address?.city,
        state: address?.state,
        zip: address?.zip,
        is_minor: is_student_minor,
        parent_approval
      })
    }

    // Update user
    await User.updateUser(userId, updates)

    // Check if profile just became complete
    const updatedUser = await User.findById(userId)
    const complete = User.isVerificationComplete(updatedUser)
    
    if (complete && !updatedUser.profile_completed_at) {
      await User.updateUser(userId, { 
        profile_completed_at: new Date() 
      })
    }

    // Return updated user
    const finalUser = await User.findById(userId)
    const userData = User.getPlainObject(finalUser)

    res.json({
      message: 'Profile updated successfully',
      user: userData
    })
  } catch (error) {
    logError('Error updating user profile', { error, userId })
    res.status(500).json({ error: 'Error updating user profile data' })
  }
})
```

## Vue Query Integration

### useUserManagement Composable

```javascript
// frontend/src/composables/useUserManagement.js

export function useUserManagement() {
  const queryClient = useQueryClient()
  const userStore = useUserStore()
  const token = computed(() => userStore.token)

  // API function
  async function updateUserProfileApi(userId, profileData, token) {
    const response = await fetch(`/api/users/${userId}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to update profile')
    }

    return response.json()
  }

  // Mutation
  const updateUserProfileMutation = useMutation({
    mutationFn: ({ userId, profileData }) => 
      updateUserProfileApi(userId, profileData, token.value),
    onSuccess: (data) => {
      // Invalidate user list to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['users'] })
      
      // Update specific user in cache
      queryClient.setQueryData(['users'], (oldUsers) => {
        if (!oldUsers) return []
        return oldUsers.map(user => 
          user.id === data.user.id ? data.user : user
        )
      })
    }
  })

  return {
    updateUserProfile: updateUserProfileMutation.mutateAsync,
    isUpdatingUserProfile: updateUserProfileMutation.isPending
  }
}
```

### Benefits of Vue Query

**Automatic Cache Management:**
- User list automatically refreshes after update
- No need to manually reload data
- Optimistic updates possible

**Loading States:**
- `isUpdatingUserProfile` reactive boolean
- Can show loading spinner during save
- Disable form during submission

**Error Handling:**
- Errors thrown by mutation
- Caught in try/catch of component
- Displayed to user via toast

## Editable Fields

### Always Editable

- ✅ Name
- ✅ Email
- ✅ Phone number
- ✅ Address (all fields)
- ✅ Minor status

### Context-Dependent

**Parent Approval:**
- Only shown if `is_student_minor = true`
- Required to be checked if minor

### Not Editable via Profile Tab

- ❌ Password (security - must use password reset)
- ❌ Role (use Account tab)
- ❌ Credits (use Credits tab)
- ❌ Approval status (use Account tab)

## Validation

### Client-Side (UX Only)

Profile component validates in real-time:

```javascript
import { validateProfileData } from '@/utils/formValidation'
import { profileSchemaFlat } from '@common/schemas'

// Validate on submit
const result = profileSchemaFlat.safeParse(profileData.value)

if (!result.success) {
  // Show errors to user
  errors.value = formatZodErrors(result.error)
  return
}
```

### Server-Side (Security)

Backend validates with same Zod schema:

```javascript
const validation = User.validateVerificationData(data)

if (!validation.valid) {
  return res.status(400).json({
    error: 'Validation failed',
    errors: validation.errors
  })
}
```

### Validation Rules

| Field | Rule | Example |
|-------|------|---------|
| Name | Min 1 char | "John Doe" |
| Email | Valid email | "john@example.com" |
| Phone | Valid format | "555-123-4567" |
| Address Line 1 | Min 1 char | "123 Main St" |
| Address Line 2 | Optional | "Apt 4" or "" |
| City | Min 1 char | "Seattle" |
| State | Exactly 2 chars | "WA" |
| ZIP | 5 or 9 digits | "98101" or "98101-1234" |
| Minor | Boolean | true/false |
| Parent Approval | Required if minor | true (if minor) |

## Common Use Cases

### 1. Correcting Student Contact Info

**Scenario:** Student entered wrong phone number

**Steps:**
1. Open UserManager for student
2. Go to Profile tab
3. Update phone number field
4. Click "Update Profile"
5. Verify success toast

### 2. Updating Address

**Scenario:** Student moved to new address

**Steps:**
1. Find student in User Management
2. Profile tab → Update address fields
3. Update city, state, ZIP as needed
4. Save changes

### 3. Fixing Minor Status

**Scenario:** Student accidentally marked as minor

**Steps:**
1. Open student profile
2. Uncheck "I am under 18" checkbox
3. Parent approval section disappears
4. Save changes

### 4. Completing Incomplete Profile

**Scenario:** Admin needs to complete student's profile

**Steps:**
1. Find student with "Incomplete" badge
2. Fill in missing phone number
3. Fill in missing address
4. Set minor status
5. Save → `profile_completed_at` timestamp set

## Data Persistence

### Update Flow

```
User edits form
  ↓
Click "Update Profile"
  ↓
Zod validation (frontend)
  ↓
Emit profile-updated event
  ↓
Parent calls Vue Query mutation
  ↓
PUT /api/users/:userId/profile
  ↓
Zod validation (backend)
  ↓
Update database
  ↓
Check if profile complete → Set timestamp
  ↓
Return updated user
  ↓
Invalidate Vue Query cache
  ↓
UI automatically updates
  ↓
Show success toast
```

### Database Transaction

Updates are atomic:

```javascript
await User.updateUser(userId, {
  name: 'New Name',
  phone_number: '555-999-8888',
  user_profile_data: { /* address */ }
})
```

If any field fails, entire update rolls back.

### Cache Invalidation

```javascript
// After successful update
queryClient.invalidateQueries({ queryKey: ['users'] })

// Triggers automatic refetch
// UI updates with latest data
// EditingUser ref updated
```

## Troubleshooting

### "Changes not saving"

**Symptoms:** Click save, toast shows, but data reverts

**Causes:**
1. Validation failing on backend
2. Network error
3. Stale cache

**Debug:**
```javascript
// Check browser console
// Check Network tab → PUT /api/users/:userId/profile
// Check response for errors
// Check backend logs
```

**Solution:**
- Fix validation errors
- Retry save
- Refresh page to clear cache

### "Can't edit certain user"

**Symptoms:** Edit button grayed out or missing

**Causes:**
1. Not logged in as admin
2. Insufficient permissions
3. User is viewing own profile (should use Account page)

**Solution:**
- Verify admin role: `userStore.role === 'admin'`
- Check CASL permissions: `userStore.canManageUsers`

### "Parent approval checkbox won't work"

**Symptoms:** Can't check parent approval

**Cause:** `is_student_minor` is false

**Solution:**
1. Check "I am under 18" first
2. Then check "Parent approval"
3. Save both together

### "Email already exists" error

**Symptoms:** 400 error when updating email

**Cause:** Email is already in use by another user

**Solution:**
- Use a different email
- Or merge/delete duplicate account

## Best Practices

### 1. Verify Before Saving

**Always double-check:**
- Email is correct (typos are common)
- Phone number is formatted correctly
- Address is complete
- ZIP code matches city/state

### 2. Document Major Changes

**If making significant edits:**
- Leave a note in internal system
- Email student about the change
- Keep audit trail (future feature)

### 3. Handle Sensitive Data Carefully

**Remember:**
- Phone numbers are PII
- Addresses are sensitive
- Minors need extra protection
- Follow data privacy laws (GDPR, CCPA)

### 4. Test After Editing

**After updating:**
- Refresh page to verify persistence
- Check student can still login
- Verify email deliverability
- Test booking flow still works

## Security Notes

### Authorization Checks

**Backend:**
```javascript
authorize('manage', 'User')  // CASL middleware
```

**Frontend:**
```javascript
if (!userStore.canManageUsers) {
  // Hide edit functionality
}
```

### Input Sanitization

- ✅ Zod trims strings
- ✅ Sequelize prevents SQL injection
- ✅ Vue auto-escapes output (XSS protection)

### Audit Trail

**Current:** No audit trail

**Future Enhancement:**
```javascript
// Log every profile change
ProfileAuditLog.create({
  user_id: 123,
  changed_by: adminUserId,
  field: 'phone_number',
  old_value: '555-111-1111',
  new_value: '555-222-2222',
  timestamp: new Date()
})
```

## Testing

### Manual Testing

**Checklist:**
- [ ] Edit student name → Saves correctly
- [ ] Edit email → Saves correctly
- [ ] Edit phone → Validates format
- [ ] Edit address → All fields save
- [ ] Invalid ZIP → Shows error
- [ ] Toggle minor status → Parent approval appears/disappears
- [ ] Submit as minor without approval → Validation error
- [ ] Close modal without saving → Changes discarded
- [ ] Save → Success toast appears
- [ ] Refresh page → Changes persisted

### Automated Tests

**Backend:**
```bash
npm run test:backend tests/profile-api.test.js
```

**Coverage:**
- Admin updating another user's profile
- Validation with Zod
- profile_completed_at timestamp
- Preserving existing data on partial updates

## Resources

- **Component:** `/frontend/src/components/Profile.vue`
- **Modal:** `/frontend/src/components/UserManager.vue`
- **Composable:** `/frontend/src/composables/useUserManagement.js`
- **API Route:** `/routes/users.js` (PUT /:userId/profile)
- **Tests:** `/tests/profile-api.test.js`
- **Zod Schemas:** `/common/schemas/profile.schema.mjs`

---

**Related Docs:**
- [User Profile & Verification](./USER_PROFILE_VERIFICATION.md)
- [Zod Integration Guide](./ZOD_INTEGRATION_GUIDE.md)
- [CASL Permissions](./PERMISSIONS.md)


