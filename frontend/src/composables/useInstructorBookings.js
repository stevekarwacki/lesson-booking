/**
 * Instructor Bookings Composable with Vue Query
 *
 * Fetches a paginated, filterable booking list for a given instructor.
 * Uses the instructor endpoint with page/limit params which delegates to
 * Calendar.getAllBookings on the backend.
 *
 * @example
 * const { bookings, total, totalPages, currentPage, setPage, setFilters } =
 *   useInstructorBookings(computed(() => instructor.value?.id), { enabled: computed(() => isInstructor) })
 */

import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '../stores/userStore'
import { computed, ref } from 'vue'

const DEFAULT_LIMIT = 20

async function fetchInstructorBookings(instructorId, page, limit, filters, token) {
  const params = new URLSearchParams({ page, limit })
  if (filters.studentId) params.set('studentId', filters.studentId)
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)

  const response = await fetch(`/api/calendar/instructor/${instructorId}?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!response.ok) throw new Error('Failed to fetch instructor bookings')
  return response.json()
}

export function useInstructorBookings(instructorId, { enabled: enabledOverride = null, initialFilters = {} } = {}) {
  const userStore = useUserStore()
  const queryClient = useQueryClient()
  const token = computed(() => userStore.token)
  const currentPage = ref(1)
  const filters = ref({ studentId: null, startDate: null, endDate: null, ...initialFilters })

  const normalizedId = computed(() => {
    const v = typeof instructorId === 'object' && instructorId !== null && 'value' in instructorId
      ? instructorId.value
      : instructorId
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
    queryKey: ['instructorBookings', normalizedId, currentPage, filters],
    queryFn: () => fetchInstructorBookings(
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
    queryClient.invalidateQueries({ queryKey: ['instructorBookings', normalizedId.value] })
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
