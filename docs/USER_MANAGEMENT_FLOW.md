# User Management Flow

## Overview

The consolidated User Management system provides a unified interface for managing all users (students, instructors, and admins) in a single view. This replaced the previous separate "Users" and "Instructors" pages.

**Location**: `/admin/users`  
**Component**: `UserManager.vue`  
**Permissions**: Requires `manage:User` permission (Admin only)

## Features

### 1. User List with Search & Filter

**Search Bar** (`SearchBar.vue`):
- Dropdown autocomplete search
- Searches by partial match: first name, last name, full name, email
- Shows results in real-time dropdown
- Persists search query when opening modals

**Filter Tabs** (`FilterTabs.vue`):
- All Users
- Students (default)
- Instructors
- Admins
- Unverified Users

Search and filter work independently - you can search within a filtered view.

### 2. Tabbed User Modal

The user edit modal (`TabbedModal.vue`) dynamically shows tabs based on user role:

#### Profile Tab (All Users)
- Name, email, password
- Role displayed as static text (changes only from Account tab)

#### Instructor Details Tab (Instructors Only)
- Bio, specialties, hourly rate
- Automatically creates/persists `Instructor` profile when role changes to instructor
- Deleting instructor profile reverts role to student

#### Availability Tab (Instructors Only)
- Google Calendar OAuth integration (`GoogleCalendarSettings.vue`)
- Availability grid management (`InstructorAvailabilityManager.vue`)
- View-only availability display (`InstructorAvailabilityView.vue`)

#### Bookings Tab (Students Only)
- List of all bookings (`BookingList.vue`)
- Reschedule functionality (`EditBooking.vue` with `SlideTransition.vue`)
- Cancel with optional refund (`RefundModal.vue`)

#### Memberships Tab (Students Only)
- Current subscription details
- Cancel/reactivate subscription
- Create new subscription

#### Account Tab (Admins Only)
- Account approval toggle
- Role management (student ↔ instructor ↔ admin)
- Delete account (danger zone)

## Data Flow

### Vue Query Integration

All data fetching uses Vue Query (Tanstack Query) for caching and state management:

**Composables**:
- `useUserManagement.js` - User/instructor CRUD
- `useUserSubscription.js` - Subscription management
- `useUserBookings.js` - User bookings
- `usePaymentPlans.js` - Available payment plans

**Pattern**:
```vue
<script setup>
import { useUserManagement } from '@/composables/useUserManagement'

const {
  users,           // Reactive data
  isLoadingUsers,  // Loading state
  updateUser,      // Mutation function
  isUpdatingUser   // Mutation loading state
} = useUserManagement()
</script>
```

### Conditional Queries

Subscription and booking queries only run for students:

```javascript
const isEditingStudent = computed(() => editingUser.value?.role === 'student')
const studentUserId = computed(() => isEditingStudent.value ? editingUserId.value : null)

const { subscription, isLoadingSubscription } = useUserSubscription(studentUserId)
const { bookings, isLoadingBookings } = useUserBookings(studentUserId)
```

When `studentUserId` is `null`, queries are disabled and don't make API calls.

## Role Changes & Data Persistence

### Student → Instructor
1. Role updated in `User` model
2. `Instructor` profile created with default values:
   ```javascript
   {
     user_id: userId,
     bio: '',
     specialties: '',
     hourly_rate: 0,
     is_active: true
   }
   ```
3. Student data (bookings, subscriptions) persists
4. Instructor Details and Availability tabs become visible

### Instructor → Student
1. Role updated in `User` model
2. `Instructor` profile remains in database (soft persistence)
3. Instructor tabs hidden
4. If user becomes instructor again, existing profile is reused

### Any Role → Admin
1. Role updated in `User` model
2. All existing data persists
3. Account tab becomes visible

## API Endpoints

### User Management
- `GET /api/admin/users` - Fetch all users with instructor profiles
- `POST /api/admin/users` - Create new user
- `PATCH /api/admin/users/:id` - Update user (name, email, role)
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/users/:id/approval` - Update approval status

### Instructor Management
- `GET /api/instructors` - Fetch all instructors
- `POST /api/instructors` - Create instructor profile
- `PATCH /api/instructors/:id` - Update instructor profile
- `DELETE /api/instructors/:id` - Delete instructor profile

### Subscription Management
- `GET /api/admin/users/:userId/subscription` - Get user's subscription (returns `null` if none)
- `POST /api/admin/users/:userId/subscription` - Create subscription
- `POST /api/admin/subscriptions/:id/cancel` - Cancel subscription
- `POST /api/admin/subscriptions/:id/reactivate` - Reactivate subscription
- `GET /api/payments/plans` - Get available payment plans

### Booking Management
- `GET /api/calendar/student/:userId?includeAll=true` - Get user's bookings
- `PATCH /api/calendar/student/:bookingId` - Reschedule booking
- `DELETE /api/calendar/student/:bookingId` - Cancel booking

## UI/UX Patterns

### Pending Role Changes

Role changes in the Account tab use a "pending" pattern to prevent premature tab switching:

```javascript
const pendingRoleChange = ref(null)

// On dropdown change - only update local state
<select v-model="pendingRoleChange">

// On save - update actual user role
const saveRoleChange = async () => {
  editingUser.value.role = pendingRoleChange.value
  await updateUser({ userId: editingUser.value.id, userData: editingUser.value })
}
```

This ensures tabs only update after successful save, not on dropdown selection.

### Smooth Transitions

The booking reschedule flow uses `SlideTransition.vue` for smooth navigation:

```vue
<SlideTransition>
  <BookingList v-if="!selectedBooking" />
  <EditBooking v-else @booking-updated="handleBookingUpdated" />
</SlideTransition>
```

**Key Implementation Details**:
- Buttons maintain constant width (no text changes during loading)
- Data refetch delayed until after transition completes
- Loading states keep buttons disabled during transitions

```javascript
const handleBookingUpdated = async (goBack) => {
  formFeedback.showSuccess('Booking rescheduled successfully!')
  if (goBack) {
    goBack() // Start transition
    // Delay refetch until after transition (300ms + 50ms buffer)
    setTimeout(async () => {
      await refetchBookings()
      selectedBooking.value = null
    }, 350)
  }
}
```

### Search Persistence

Search query persists when opening/closing modals:

```javascript
const handleSearchSelect = (user) => {
  openEditModal(user)
  // searchQuery.value NOT cleared - persists for user convenience
}
```

Only clears when user manually clears it or navigates away from page.

## Database Schema

### User Model
```javascript
{
  id: INTEGER,
  name: STRING,
  email: STRING (unique),
  password: STRING (hashed),
  role: ENUM('student', 'instructor', 'admin'),
  is_approved: BOOLEAN,
  created_at: DATE,
  updated_at: DATE
}
```

### Instructor Model
```javascript
{
  id: INTEGER,
  user_id: INTEGER (FK -> User.id),
  bio: TEXT,
  specialties: TEXT,
  hourly_rate: DECIMAL,
  is_active: BOOLEAN,
  created_at: DATE,
  updated_at: DATE
}
```

**Relationship**: One-to-One (User hasOne Instructor, Instructor belongsTo User)

### Subscription Model
```javascript
{
  id: INTEGER,
  user_id: INTEGER (FK -> User.id),
  payment_plan_id: INTEGER (FK -> PaymentPlan.id),
  stripe_subscription_id: STRING (unique),
  status: STRING,
  current_period_start: DATE,
  current_period_end: DATE,
  cancel_at_period_end: BOOLEAN,
  created_at: DATE,
  updated_at: DATE
}
```

## Testing

### Backend Tests
- `/tests/user-management.test.js` - User CRUD, role changes, instructor profile persistence
- `/tests/subscription-management.test.js` - Subscription lifecycle, payment plans
- `/tests/vue-query-composables.test.js` - Composable logic, parameter normalization

### Test Patterns
```javascript
describe('User Management', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true }) // Clean database
  })

  afterEach(async () => {
    await sequelize.drop() // Cleanup
  })

  it('should create instructor profile when role changes to instructor', async () => {
    const user = await User.create({ /* ... */ role: 'student' })
    await user.update({ role: 'instructor' })
    
    const instructor = await Instructor.findOne({ where: { user_id: user.id } })
    assert.ok(instructor)
  })
})
```

## Related Documentation

- [Vue Query Pattern Guide](VUE_QUERY_PATTERN.md)
- [CASL Permissions Guide](CASL_PERMISSIONS_GUIDE.md)
- [Testing Guide](TESTING_GUIDE.md)

