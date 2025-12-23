/**
 * Vue Query (Tanstack Query) Configuration
 * 
 * Centralized configuration for Vue Query client.
 * This is the pilot implementation for Phase 2 - User & Instructor Management.
 * 
 * Key Configuration Decisions:
 * - staleTime: 5 minutes - Data is considered fresh for 5 minutes
 * - cacheTime: 10 minutes - Unused data stays in cache for 10 minutes
 * - refetchOnWindowFocus: true - Refetch when user returns to tab (good UX)
 * - retry: 1 - Retry failed requests once before showing error
 * 
 * @see https://tanstack.com/query/latest/docs/vue/guides/important-defaults
 */

export const vueQueryConfig = {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        // How long data is considered fresh (no refetch needed)
        staleTime: 1000 * 60 * 5, // 5 minutes
        
        // How long unused data stays in cache before garbage collection
        cacheTime: 1000 * 60 * 10, // 10 minutes
        
        // Refetch when user returns to the window/tab
        refetchOnWindowFocus: true,
        
        // Refetch when network reconnects
        refetchOnReconnect: true,
        
        // Number of retry attempts for failed queries
        retry: 1,
        
        // Don't refetch on mount if data is fresh
        refetchOnMount: true,
        
        // Keep previous data while fetching new data (better UX)
        keepPreviousData: true,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
  },
}

