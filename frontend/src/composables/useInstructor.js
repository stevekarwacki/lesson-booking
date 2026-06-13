/**
 * useInstructor
 *
 * Unified composable for reading and writing Instructor data.
 *
 * Modes
 * -----
 *  'self'  – instructor editing their own profile.
 *            Fetches GET /api/instructors/me.
 *            Mutations resolve the instructor id from the query result.
 *
 *  'admin' – admin reading/writing any instructor (default).
 *            instructorId → GET /api/instructors/:id
 *            userId       → GET /api/instructors/user/:userId
 *
 * All id parameters accept either a raw value or a ref.
 *
 * @example Self-service (AccountPage)
 *   const { instructor, updateInstructor, isUpdatingInstructor } =
 *     useInstructor({ mode: 'self' })
 *
 * @example Admin (UserManager)
 *   const { instructor, updateInstructor, createInstructor } =
 *     useInstructor({ mode: 'admin', userId: editingUser.value.id })
 *
 * @example Read-only by instructor id (Booking.vue)
 *   const { instructor, hourlyRate } =
 *     useInstructor({ instructorId: computed(() => slot.instructorId) })
 */

import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '@/stores/userStore'

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchInstructorMe(token) {
  const res = await fetch('/api/instructors/me', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Failed to fetch instructor profile')
  return res.json()
}

async function fetchInstructorById(id, token) {
  const res = await fetch(`/api/instructors/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Failed to fetch instructor')
  return res.json()
}

async function fetchInstructorByUserId(userId, token) {
  const res = await fetch(`/api/instructors/user/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Failed to fetch instructor')
  return res.json()
}

async function createInstructorApi(data, token) {
  const res = await fetch('/api/instructors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error || 'Failed to create instructor')
  }
  return res.json()
}

async function updateInstructorApi(id, data, token) {
  const res = await fetch(`/api/instructors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error || 'Failed to update instructor')
  }
  return res.json()
}

async function toggleActiveApi(id, token, value) {
  const res = await fetch(`/api/instructors/${id}/toggle-active`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: value !== undefined ? JSON.stringify({ value }) : undefined
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error || 'Failed to toggle active status')
  }
  return res.json()
}

async function deleteInstructorApi(id, token) {
  const res = await fetch(`/api/instructors/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error || 'Failed to delete instructor')
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Normalize a raw value or ref to a computed
// ---------------------------------------------------------------------------
function toComputed(val) {
  if (val === null || val === undefined) return computed(() => null)
  if (typeof val === 'object' && 'value' in val) return computed(() => val.value ?? null)
  return computed(() => val)
}

// ---------------------------------------------------------------------------
// Main composable
// ---------------------------------------------------------------------------

/**
 * @param {{ mode?: 'self'|'admin', userId?: number|Ref, instructorId?: number|Ref }} options
 */
export function useInstructor({ mode = 'admin', userId = null, instructorId = null } = {}) {
  const userStore = useUserStore()
  const queryClient = useQueryClient()
  const token = computed(() => userStore.token)

  const normalizedUserId = toComputed(userId)
  const normalizedInstructorId = toComputed(instructorId)

  // -------------------------------------------------------------------------
  // Query key and fetch function
  // -------------------------------------------------------------------------
  const queryKey = computed(() => {
    if (mode === 'self') return ['instructor', 'self']
    if (normalizedInstructorId.value) return ['instructors', normalizedInstructorId.value]
    if (normalizedUserId.value) return ['instructor', 'user', normalizedUserId.value]
    return ['instructor', 'unknown']
  })

  const enabled = computed(() => {
    if (!token.value) return false
    if (mode === 'self') return true
    return !!(normalizedInstructorId.value || normalizedUserId.value)
  })

  const queryFn = () => {
    if (mode === 'self') return fetchInstructorMe(token.value)
    if (normalizedInstructorId.value) return fetchInstructorById(normalizedInstructorId.value, token.value)
    return fetchInstructorByUserId(normalizedUserId.value, token.value)
  }

  const {
    data: instructor,
    isLoading: isLoadingInstructor,
    error: instructorError,
    refetch: refetchInstructor
  } = useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  })

  const hourlyRate = computed(() => {
    if (!instructor.value?.hourly_rate) return null
    return parseFloat(instructor.value.hourly_rate)
  })

  // -------------------------------------------------------------------------
  // Cache invalidation
  // -------------------------------------------------------------------------
  const invalidateInstructor = () => {
    queryClient.invalidateQueries({ queryKey: queryKey.value })
    queryClient.invalidateQueries({ queryKey: ['instructors'] })
  }

  const invalidateAfterMutation = async () => {
    queryClient.invalidateQueries({ queryKey: ['instructors'] })
    queryClient.invalidateQueries({ queryKey: ['instructor', 'self'] })
    if (instructor.value?.id) {
      queryClient.invalidateQueries({ queryKey: ['instructors', instructor.value.id] })
    }
    if (normalizedUserId.value) {
      queryClient.invalidateQueries({ queryKey: ['instructor', 'user', normalizedUserId.value] })
    }
    if (mode === 'self') {
      await userStore.fetchUser()
    }
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------
  const createInstructorMutation = useMutation({
    mutationFn: (data) => createInstructorApi(data, token.value),
    onSuccess: () => invalidateAfterMutation()
  })

  const updateInstructorMutation = useMutation({
    mutationFn: ({ id, data }) => updateInstructorApi(id, data, token.value),
    onSuccess: () => invalidateAfterMutation()
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, value }) => toggleActiveApi(id, token.value, value),
    onSuccess: () => invalidateAfterMutation()
  })

  const deleteInstructorMutation = useMutation({
    mutationFn: (id) => deleteInstructorApi(id, token.value),
    onSuccess: () => invalidateAfterMutation()
  })

  // Accepts either { id, data } explicitly, or just data — resolving the id
  // from the cached query result (useful in self/single-instructor contexts).
  const updateInstructor = (dataOrOptions) => {
    if (dataOrOptions && typeof dataOrOptions === 'object' && 'id' in dataOrOptions && 'data' in dataOrOptions) {
      return updateInstructorMutation.mutateAsync(dataOrOptions)
    }
    const resolvedId = instructor.value?.id
    if (!resolvedId) throw new Error('Instructor id is not yet available')
    return updateInstructorMutation.mutateAsync({ id: resolvedId, data: dataOrOptions })
  }

  const toggleActive = (value, id) => {
    const resolvedId = id ?? instructor.value?.id
    if (!resolvedId) throw new Error('Instructor id is not yet available')
    return toggleActiveMutation.mutateAsync({ id: resolvedId, value })
  }

  const deleteInstructor = (id) => {
    const resolvedId = id ?? instructor.value?.id
    if (!resolvedId) throw new Error('Instructor id is not yet available')
    return deleteInstructorMutation.mutateAsync(resolvedId)
  }

  return {
    // Query state
    instructor,
    hourlyRate,
    isLoadingInstructor,
    instructorError,

    // Methods
    refetchInstructor,
    invalidateInstructor,

    // Mutations
    createInstructor: createInstructorMutation.mutateAsync,
    updateInstructor,
    toggleActive,
    deleteInstructor,

    // Mutation loading flags
    isCreatingInstructor: createInstructorMutation.isPending,
    isUpdatingInstructor: updateInstructorMutation.isPending,
    isTogglingActive: toggleActiveMutation.isPending,
    isDeletingInstructor: deleteInstructorMutation.isPending
  }
}
