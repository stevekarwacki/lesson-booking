/**
 * Student Bookings Composable with Vue Query
 *
 * Fetches a paginated, filterable booking list for a student using
 * GET /api/calendar/student/:studentId with page/limit/startDate/endDate params.
 *
 * @example
 * const { bookings, totalPages, currentPage, setPage, setFilters } =
 *   useStudentBookings(computed(() => userStore.user?.id), {
 *     enabled: computed(() => userStore.isStudent)
 *   })
 */

import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '../stores/userStore'
import { computed, ref } from 'vue'

const DEFAULT_LIMIT = 20

async function fetchStudentBookings(studentId, page, limit, filters, token) {
  const params = new URLSearchParams({ page, limit })
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)

  const response = await fetch(`/api/calendar/student/${studentId}?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!response.ok) throw new Error('Failed to fetch student bookings')
  return response.json()
}

export function useStudentBookings(studentId, { enabled: enabledOverride = null, initialFilters = {} } = {}) {
  const userStore = useUserStore()
  const queryClient = useQueryClient()
  const token = computed(() => userStore.token)
  const currentPage = ref(1)
  const filters = ref({ startDate: null, endDate: null, ...initialFilters })

  const normalizedId = computed(() => {
    const v = typeof studentId === 'object' && studentId !== null && 'value' in studentId
      ? studentId.value
      : studentId
    return v ?? null
  })

  const isEnabled = computed(() => {
    if (enabledOverride !== null) {
      const v = typeof enabledOverride === 'object' && 'value' in enabledOverride
        ? enabledOverride.value
        : enabledOverride
      if (!v) return false
    }
    return !!token.value && !!normalizedId.value
  })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['studentBookings', normalizedId, currentPage, filters],
    queryFn: () => fetchStudentBookings(
      normalizedId.value,
      currentPage.value,
      DEFAULT_LIMIT,
      filters.value,
      token.value
    ),
    enabled: isEnabled,
    staleTime: 30 * 1000,
    cacheTime: 5 * 60 * 1000,
    keepPreviousData: true
  })

  const bookings = computed(() => data.value?.bookings ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / DEFAULT_LIMIT)))

  function setPage(page) {
    currentPage.value = page
  }

  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
    currentPage.value = 1
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['studentBookings', normalizedId.value] })
  }

  return {
    bookings,
    total,
    totalPages,
    currentPage,
    isLoading,
    error,
    refetch,
    setPage,
    setFilters,
    invalidate
  }
}
