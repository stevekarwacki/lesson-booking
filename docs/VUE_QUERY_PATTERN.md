# Vue Query (Tanstack Query) Pattern Guide

## Overview

This application uses [Tanstack Query (Vue Query)](https://tanstack.com/query/latest/docs/framework/vue/overview) for server state management. Vue Query provides powerful data fetching, caching, and synchronization capabilities.

**Status**: Piloted in Phase 2 (User Management). Full migration planned for Phase 4.

## Why Vue Query?

- **Automatic Caching**: Reduces unnecessary API calls
- **Background Refetching**: Keeps data fresh automatically
- **Optimistic Updates**: Instant UI feedback (planned)
- **Loading & Error States**: Built-in state management
- **Request Deduplication**: Multiple components can request same data without duplicate calls

## Architecture

### Configuration

Vue Query is configured in `/frontend/src/config/vueQuery.js`:

```javascript
import { QueryClient } from '@tanstack/vue-query'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            cacheTime: 1000 * 60 * 10, // 10 minutes
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 1,
        },
    },
})
```

Registered in `/frontend/src/main.js`:

```javascript
import { VueQueryPlugin } from '@tanstack/vue-query'
import { queryClient } from './config/vueQuery'

app.use(VueQueryPlugin, { queryClient })
```

### Composables Pattern

All Vue Query logic is encapsulated in composables located in `/frontend/src/composables/`:

- `useUserManagement.js` - User and instructor CRUD operations
- `useUserSubscription.js` - Subscription management
- `useUserBookings.js` - User bookings
- `usePaymentPlans.js` - Payment plan queries

## Usage Patterns

### 1. Basic Query (Fetching Data)

```javascript
// In composable: useUserManagement.js
import { useQuery } from '@tanstack/vue-query'

export function useUserManagement() {
  const userStore = useUserStore()
  const token = computed(() => userStore.token)

  // Fetch function
  async function fetchUsers(token) {
    const response = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) throw new Error('Failed to fetch users')
    return response.json()
  }

  // Query
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(token.value),
    enabled: computed(() => !!token.value), // Only run when token exists
  })

  return { users, isLoading, error, refetch }
}
```

**In Component:**

```vue
<script setup>
import { useUserManagement } from '@/composables/useUserManagement'

const { users, isLoading, error } = useUserManagement()
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else>
    <div v-for="user in users" :key="user.id">
      {{ user.name }}
    </div>
  </div>
</template>
```

### 2. Parameterized Query (Conditional Fetching)

For queries that depend on a parameter (like a user ID), use reactive parameters:

```javascript
// In composable: useUserSubscription.js
export function useUserSubscription(userId) {
  const userStore = useUserStore()
  const token = computed(() => userStore.token)

  // Normalize userId (handle refs and raw values)
  const normalizedUserId = computed(() => {
    const value = typeof userId === 'object' && userId !== null && 'value' in userId
      ? userId.value
      : userId
    return value
  })

  async function fetchUserSubscription(userId, token) {
    const response = await fetch(`/api/admin/users/${userId}/subscription`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) {
      if (response.status === 404) return null // No subscription is valid
      throw new Error('Failed to fetch subscription')
    }
    return response.json()
  }

  const {
    data: subscription,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['users', normalizedUserId, 'subscription'],
    queryFn: () => fetchUserSubscription(normalizedUserId.value, token.value),
    enabled: computed(() => !!token.value && !!normalizedUserId.value), // Only run when both exist
    retry: false, // Don't retry on 404 (valid state)
  })

  return { subscription, isLoading, error, refetch }
}
```

**In Component:**

```vue
<script setup>
import { ref, computed } from 'vue'
import { useUserSubscription } from '@/composables/useUserSubscription'

const editingUserId = ref(null)
const isEditingStudent = computed(() => editingUser.value?.role === 'student')

// Only pass userId if user is a student (conditional query)
const studentUserId = computed(() => isEditingStudent.value ? editingUserId.value : null)

const { subscription, isLoading } = useUserSubscription(studentUserId)
</script>
```

**Key Points:**
- Normalize parameters to handle both refs and raw values
- Use `enabled` to conditionally run queries
- Use appropriate `retry` settings for expected error states

### 3. Mutations (Creating/Updating/Deleting Data)

```javascript
// In composable: useUserManagement.js
import { useMutation, useQueryClient } from '@tanstack/vue-query'

export function useUserManagement() {
  const queryClient = useQueryClient()
  const userStore = useUserStore()
  const token = computed(() => userStore.token)

  // Update function
  async function updateUserApi(userId, userData, token) {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData)
    })
    if (!response.ok) throw new Error('Failed to update user')
    return response.json()
  }

  // Mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, userData }) => updateUserApi(userId, userData, token.value),
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  return {
    updateUser: updateUserMutation.mutateAsync,
    isUpdatingUser: updateUserMutation.isPending,
  }
}
```

**In Component:**

```vue
<script setup>
import { useUserManagement } from '@/composables/useUserManagement'
import { useFormFeedback } from '@/composables/useFormFeedback'

const { updateUser, isUpdatingUser } = useUserManagement()
const { showSuccess, handleError } = useFormFeedback()

const saveUser = async () => {
  try {
    await updateUser({ userId: editingUser.value.id, userData: editingUser.value })
    showSuccess('User updated successfully!')
  } catch (error) {
    handleError(error, 'Failed to update user: ')
  }
}
</script>

<template>
  <button @click="saveUser" :disabled="isUpdatingUser">
    {{ isUpdatingUser ? 'Saving...' : 'Save' }}
  </button>
</template>
```

### 4. Cache Invalidation

After mutations, invalidate related queries to trigger refetch:

```javascript
// Invalidate specific query
queryClient.invalidateQueries({ queryKey: ['users'] })

// Invalidate multiple related queries
queryClient.invalidateQueries({ queryKey: ['users', userId, 'subscription'] })
queryClient.invalidateQueries({ queryKey: ['users', userId, 'bookings'] })

// Invalidate all queries for a user
queryClient.invalidateQueries({ queryKey: ['users', userId] })
```

### 5. Manual Refetch

Sometimes you need to manually refetch data:

```javascript
const { refetch } = useQuery({ /* ... */ })

// Later, trigger refetch
await refetch()
```

## Query Keys

Query keys are used for caching and invalidation. Use consistent, hierarchical keys:

```javascript
['users']                              // All users
['users', userId]                      // Specific user
['users', userId, 'subscription']      // User's subscription
['users', userId, 'bookings']          // User's bookings
['instructors']                        // All instructors
['instructors', instructorId]          // Specific instructor
['paymentPlans']                       // All payment plans
```

## Best Practices

### 1. Composable Structure

Each composable should:
- Export a single function that returns query/mutation objects
- Accept reactive parameters (refs or computed)
- Normalize parameters to handle both refs and raw values
- Use `enabled` for conditional queries
- Handle authentication tokens from user store

### 2. Error Handling

```javascript
// In composable - throw errors
async function fetchData(token) {
  const response = await fetch('/api/data', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!response.ok) throw new Error('Failed to fetch data')
  return response.json()
}

// In component - catch errors
const { data, error } = useQuery({ /* ... */ })

// Display errors in template
<div v-if="error" class="error-message">{{ error.message }}</div>
```

### 3. Loading States

```vue
<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else>
    <!-- Render data -->
  </div>
</template>
```

### 4. Optimistic Updates (Future Enhancement)

```javascript
const mutation = useMutation({
  mutationFn: updateUser,
  onMutate: async (newUser) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['users'] })
    
    // Snapshot previous value
    const previousUsers = queryClient.getQueryData(['users'])
    
    // Optimistically update
    queryClient.setQueryData(['users'], (old) => 
      old.map(u => u.id === newUser.id ? newUser : u)
    )
    
    return { previousUsers }
  },
  onError: (err, newUser, context) => {
    // Rollback on error
    queryClient.setQueryData(['users'], context.previousUsers)
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['users'] })
  },
})
```

## Testing Vue Query Composables

See `/tests/vue-query-composables.test.js` for examples:

```javascript
import { describe, it, expect } from 'node:test'
import { ref, computed } from 'vue'
import { useUserSubscription } from '@/composables/useUserSubscription'

describe('Vue Query Composables', () => {
  it('should normalize userId from ref', () => {
    const userId = ref(123)
    const { subscription } = useUserSubscription(userId)
    // Test that query uses normalized value
  })

  it('should not run query when userId is null', () => {
    const userId = ref(null)
    const { subscription, isLoading } = useUserSubscription(userId)
    // Test that query is disabled
  })
})
```

## Migration Status

### ✅ Completed (Phase 2)
- User Management (CRUD)
- Instructor Management (CRUD)
- User Subscriptions
- User Bookings
- Payment Plans
- User Approval Status

### 🔄 Planned (Phase 4)
- Booking Management
- Credit Management
- Instructor Availability
- Calendar Events
- Settings Management

## Related Documentation

- [Tanstack Query Docs](https://tanstack.com/query/latest/docs/framework/vue/overview)
- [Testing Guide](TESTING_GUIDE.md)
- [User Management Flow](USER_MANAGEMENT_FLOW.md)

