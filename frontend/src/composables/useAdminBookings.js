/**
 * Admin Bookings Composable with Vue Query
 *
 * Provides a paginated, filterable query over all bookings across all instructors.
 * Admin-only: the backend endpoint is gated by manage:User permission.
 *
 * @example
 * const { bookings, total, isLoading, setFilters, setPage } = useAdminBookings()
 */

import { useQuery } from '@tanstack/vue-query'
import { useUserStore } from '../stores/userStore'
import { computed, ref } from 'vue'

const DEFAULT_LIMIT = 25

async function fetchAllBookings(params, token) {
  const query = new URLSearchParams()
  if (params.instructorId) query.set('instructorId', params.instructorId)
  if (params.studentId) query.set('studentId', params.studentId)
  if (params.startDate) query.set('startDate', params.startDate)
  if (params.endDate) query.set('endDate', params.endDate)
  if (params.status) query.set('status', params.status)
  query.set('page', params.page ?? 1)
  query.set('limit', params.limit ?? DEFAULT_LIMIT)

  const response = await fetch(`/api/calendar/bookings?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to fetch bookings')
  }

  return response.json()
}

export function useAdminBookings({ enabled: enabledOverride = null, initialFilters = {} } = {}) {
  const userStore = useUserStore()
  const token = computed(() => userStore.token)

  const isEnabled = computed(() => {
    if (enabledOverride !== null) {
      const v = typeof enabledOverride === 'object' && 'value' in enabledOverride
        ? enabledOverride.value
        : enabledOverride
      if (!v) return false
    }
    return !!token.value
  })

  const filters = ref({
    instructorId: null,
    studentId: null,
    startDate: null,
    endDate: null,
    status: null,
    ...initialFilters
  })
  const currentPage = ref(1)

  const params = computed(() => ({
    ...filters.value,
    page: currentPage.value,
    limit: DEFAULT_LIMIT
  }))

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['adminBookings', params],
    queryFn: () => fetchAllBookings(params.value, token.value),
    enabled: isEnabled,
    staleTime: 30 * 1000,
    cacheTime: 5 * 60 * 1000,
    keepPreviousData: true
  })

  const bookings = computed(() => data.value?.bookings ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / DEFAULT_LIMIT)))

  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
    currentPage.value = 1
  }

  function setPage(page) {
    currentPage.value = page
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
    total,
    totalPages,
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
