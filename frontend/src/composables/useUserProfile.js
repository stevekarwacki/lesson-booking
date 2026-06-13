/**
 * useUserProfile
 *
 * Unified, role-aware composable for reading and writing User profile data
 * (name, email, phone, address, minor status).  Supports two modes:
 *
 *  mode: 'self'  – authenticated user editing their own profile.
 *                  Reads live data from userStore (no extra query).
 *                  Saves via PUT /api/users/me/profile.
 *
 *  mode: 'admin' – admin editing any user's profile.
 *                  Requires `userId`.
 *                  Saves via PUT /api/users/:userId/profile.
 *                  Reading the user object is the caller's responsibility
 *                  (it is already in the admin users query / editingUser ref).
 *
 * Consolidates the logic previously split across:
 *  - Profile.vue (raw fetch to /api/users/me/profile)
 *  - useProfileUpdate.js (mutation to /api/users/me/verification)
 *  - useUserManagement.js updateUserProfile (mutation to /api/users/:id/profile)
 *
 * profileData shape (both modes):
 * {
 *   name?: string,
 *   email?: string,
 *   phone_number?: string,
 *   is_student_minor?: boolean,
 *   parent_approval?: boolean|null,
 *   address?: { line_1, line_2, city, state, zip }
 * }
 *
 * @example – self-service (Profile.vue / AccountPage)
 *   const { selfUser, updateUserProfile, isUpdatingUserProfile } =
 *     useUserProfile({ mode: 'self' })
 *
 * @example – admin (UserManager)
 *   const { updateUserProfile, isUpdatingUserProfile } =
 *     useUserProfile({ mode: 'admin', userId: editingUser.value.id })
 */

import { computed } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '@/stores/userStore'

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function updateSelfProfileApi(profileData, token) {
  const res = await fetch('/api/users/me/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(profileData)
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error || 'Failed to update profile')
  }
  return res.json()
}

async function updateAdminProfileApi(userId, profileData, token) {
  const res = await fetch(`/api/users/${userId}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(profileData)
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error || 'Failed to update profile')
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Normalization helper – accepts a ref or raw value
// ---------------------------------------------------------------------------
function normalize(val) {
  if (val === null || val === undefined) return computed(() => null)
  if (typeof val === 'object' && 'value' in val) return computed(() => val.value ?? null)
  return computed(() => val)
}

// ---------------------------------------------------------------------------
// Main composable
// ---------------------------------------------------------------------------

/**
 * @param {{ mode?: 'self'|'admin', userId?: number|Ref<number|null> }} options
 */
export function useUserProfile({ mode = 'self', userId = null } = {}) {
  const userStore = useUserStore()
  const queryClient = useQueryClient()
  const token = computed(() => userStore.token)
  const normalizedUserId = normalize(userId)

  // In self mode, expose the store's user directly so components can bind
  // form fields without a separate query.
  const selfUser = computed(() => (mode === 'self' ? userStore.user : null))

  // -------------------------------------------------------------------------
  // Mutation
  // -------------------------------------------------------------------------
  const updateProfileMutation = useMutation({
    mutationFn: (profileData) => {
      if (mode === 'self') {
        return updateSelfProfileApi(profileData, token.value)
      }
      const id = normalizedUserId.value
      if (!id) throw new Error('userId is required in admin mode')
      return updateAdminProfileApi(id, profileData, token.value)
    },
    onSuccess: async () => {
      // Always invalidate the admin users list so UserManager stays fresh
      queryClient.invalidateQueries({ queryKey: ['users'] })

      if (mode === 'self') {
        // Refresh the userStore so Profile.vue reflects the saved data
        await userStore.fetchUser()
      }
    }
  })

  return {
    // Self-mode user data (reactive; null in admin mode)
    selfUser,

    // Mutation
    updateUserProfile: updateProfileMutation.mutateAsync,
    isUpdatingUserProfile: updateProfileMutation.isPending,
    updateUserProfileError: updateProfileMutation.error,
    isUpdateUserProfileSuccess: updateProfileMutation.isSuccess,
    resetUpdateUserProfile: updateProfileMutation.reset
  }
}
