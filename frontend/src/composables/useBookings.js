/**
 * useBookings — unified booking list composable
 *
 * Replaces useAdminBookings, useInstructorBookings, useStudentBookings, useUserBookings.
 *
 * All roles use GET /api/calendar/bookings. The server enforces scoping:
 *   - Students: always filtered to own student_id
 *   - Instructors: always filtered to own instructor record
 *   - Admins: unrestricted
 *
 * @example
 * // BookingsPage (admin)
 * const { bookings, totalBookings, currentPage, setFilters, setPage } =
 *   useBookings({ enabled: computed(() => userStore.isAdmin) })
 *
 * // BookingsPage (student)
 * const { bookings, totalBookings, currentPage, setPage } =
 *   useBookings({ enabled: computed(() => userStore.isStudent) })
 *
 * // UserManager modal (admin viewing a student)
 * const { bookings, totalBookings, currentPage, setFilters, setPage } =
 *   useBookings({ initialFilters: { studentId: editingUserId } })
 */

import { useQuery } from '@tanstack/vue-query'
import { useUserStore } from '../stores/userStore'
import { computed, ref } from 'vue'

const DEFAULT_PAGE_SIZE = 20

async function fetchBookings(filters, page, pageSize, token) {
  const params = new URLSearchParams({ page, limit: pageSize })
  if (filters.instructorId) params.set('instructorId', filters.instructorId)
  if (filters.studentId) params.set('studentId', filters.studentId)
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  if (filters.status) params.set('status', filters.status)

  const response = await fetch(`/api/calendar/bookings?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to fetch bookings')
  }
  return response.json()
}

export function useBookings({
  pageSize = DEFAULT_PAGE_SIZE,
  enabled: enabledOverride = null,
  initialFilters = {}
} = {}) {
  const userStore = useUserStore()
  const token = computed(() => userStore.token)
  const currentPage = ref(1)

  const filters = ref({
    instructorId: null,
    studentId: null,
    startDate: null,
    endDate: null,
    status: null,
    ...initialFilters
  })

  const isEnabled = computed(() => {
    if (enabledOverride !== null) {
      const v = typeof enabledOverride === 'object' && 'value' in enabledOverride
        ? enabledOverride.value
        : enabledOverride
      if (!v) return false
    }
    return !!token.value
  })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bookings', filters, currentPage],
    queryFn: () => fetchBookings(filters.value, currentPage.value, pageSize, token.value),
    enabled: isEnabled,
    staleTime: 30 * 1000,
    cacheTime: 5 * 60 * 1000,
    keepPreviousData: true
  })

  const bookings = computed(() => data.value?.bookings ?? [])
  const totalBookings = computed(() => data.value?.total ?? null)

  function setPage(page) {
    currentPage.value = page
  }

  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
    currentPage.value = 1
  }

  function clearFilters() {
    filters.value = {
      instructorId: null,
      studentId: null,
      startDate: null,
      endDate: null,
      status: null
    }
    currentPage.value = 1
  }

  return {
    bookings,
    totalBookings,
    currentPage,
    filters,
    isLoading,
    error,
    refetch,
    setFilters,
    setPage,
    clearFilters
  }
}
