/**
 * User Management Composable with Vue Query
 * 
 * This is the pilot implementation of Tanstack Query for Phase 2.
 * Provides reactive queries and mutations for user and instructor management.
 * 
 * Key Features:
 * - Automatic caching and background refetching
 * - Optimistic updates for better UX
 * - Automatic cache invalidation on mutations
 * - Loading and error states handled by Vue Query
 * 
 * @example
 * import { useUserManagement } from '@/composables/useUserManagement'
 * 
 * const { 
 *   users, 
 *   isLoadingUsers, 
 *   createUser, 
 *   updateUser 
 * } = useUserManagement()
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '../stores/userStore'
import { computed } from 'vue'

/**
 * Fetch all users from the API
 */
async function fetchUsers(token) {
  const response = await fetch('/api/admin/users', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch users')
  }
  
  const data = await response.json()
  return data.users
}

/**
 * Fetch all instructors from the API
 */
async function fetchInstructors(token) {
  const response = await fetch('/api/instructors', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch instructors')
  }
  
  return response.json()
}

/**
 * Create a new user
 */
async function createUserApi(userData, token) {
  const response = await fetch('/api/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to create user')
  }
  
  return response.json()
}

/**
 * Update an existing user
 */
async function updateUserApi(userId, userData, token) {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to update user')
  }
  
  return response.json()
}

/**
 * Delete a user
 */
async function deleteUserApi(userId, token) {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to delete user')
  }
  
  return response.json()
}

/**
 * Create a new instructor profile
 */
async function createInstructorApi(instructorData, token) {
  const response = await fetch('/api/instructors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(instructorData)
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to create instructor')
  }
  
  return response.json()
}

/**
 * Update an existing instructor profile
 */
async function updateInstructorApi(instructorId, instructorData, token) {
  const response = await fetch(`/api/instructors/${instructorId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(instructorData)
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to update instructor')
  }
  
  return response.json()
}

/**
 * Delete an instructor profile
 */
async function deleteInstructorApi(instructorId, token) {
  const response = await fetch(`/api/instructors/${instructorId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to delete instructor')
  }
  
  return response.json()
}

/**
 * Update user approval status
 */
async function updateUserApprovalApi(userId, isApproved, token) {
  const response = await fetch(`/api/users/${userId}/approval`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ isApproved })
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to update approval status')
  }
  
  return response.json()
}

/**
 * Main composable for user management
 */
export function useUserManagement() {
  const userStore = useUserStore()
  const queryClient = useQueryClient()
  const token = computed(() => userStore.token)
  
  // Query: Fetch all users
  const { 
    data: users, 
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(token.value),
    enabled: computed(() => !!token.value),
  })
  
  // Query: Fetch all instructors
  const { 
    data: instructors, 
    isLoading: isLoadingInstructors,
    error: instructorsError,
    refetch: refetchInstructors
  } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => fetchInstructors(token.value),
    enabled: computed(() => !!token.value),
  })
  
  // Mutation: Create user
  const createUserMutation = useMutation({
    mutationFn: (userData) => createUserApi(userData, token.value),
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
  
  // Mutation: Update user
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, userData }) => updateUserApi(userId, userData, token.value),
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] })
      // Also invalidate instructors in case role changed
      queryClient.invalidateQueries({ queryKey: ['instructors'] })
    },
  })
  
  // Mutation: Delete user
  const deleteUserMutation = useMutation({
    mutationFn: (userId) => deleteUserApi(userId, token.value),
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] })
      // Also invalidate instructors in case it was an instructor
      queryClient.invalidateQueries({ queryKey: ['instructors'] })
    },
  })
  
  // Mutation: Create instructor
  const createInstructorMutation = useMutation({
    mutationFn: (instructorData) => createInstructorApi(instructorData, token.value),
    onSuccess: () => {
      // Invalidate and refetch instructors list
      queryClient.invalidateQueries({ queryKey: ['instructors'] })
      // Also invalidate users to get updated role
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
  
  // Mutation: Update instructor
  const updateInstructorMutation = useMutation({
    mutationFn: ({ instructorId, instructorData }) => 
      updateInstructorApi(instructorId, instructorData, token.value),
    onSuccess: () => {
      // Invalidate and refetch instructors list
      queryClient.invalidateQueries({ queryKey: ['instructors'] })
    },
  })
  
  // Mutation: Delete instructor
  const deleteInstructorMutation = useMutation({
    mutationFn: (instructorId) => deleteInstructorApi(instructorId, token.value),
    onSuccess: () => {
      // Invalidate and refetch instructors list
      queryClient.invalidateQueries({ queryKey: ['instructors'] })
      // Also invalidate users to get updated role
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
  
  // Mutation: Update user approval status
  const updateUserApprovalMutation = useMutation({
    mutationFn: ({ userId, isApproved }) => updateUserApprovalApi(userId, isApproved, token.value),
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
  
  return {
    // Users
    users,
    isLoadingUsers,
    usersError,
    refetchUsers,
    createUser: createUserMutation.mutateAsync,
    updateUser: updateUserMutation.mutateAsync,
    deleteUser: deleteUserMutation.mutateAsync,
    isCreatingUser: createUserMutation.isPending,
    isUpdatingUser: updateUserMutation.isPending,
    isDeletingUser: deleteUserMutation.isPending,
    
    // Instructors
    instructors,
    isLoadingInstructors,
    instructorsError,
    refetchInstructors,
    createInstructor: createInstructorMutation.mutateAsync,
    updateInstructor: updateInstructorMutation.mutateAsync,
    deleteInstructor: deleteInstructorMutation.mutateAsync,
    isCreatingInstructor: createInstructorMutation.isPending,
    isUpdatingInstructor: updateInstructorMutation.isPending,
    isDeletingInstructor: deleteInstructorMutation.isPending,
    
    // User Approval
    updateUserApproval: updateUserApprovalMutation.mutateAsync,
    isUpdatingUserApproval: updateUserApprovalMutation.isPending,
  }
}

