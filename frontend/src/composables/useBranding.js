import { useQuery } from '@tanstack/vue-query'

/**
 * Fetch branding information from API
 * @returns {Promise<Object>} Branding info (logo, company name, etc.)
 */
async function fetchBranding() {
    const response = await fetch('/api/branding')
    
    if (!response.ok) {
        throw new Error('Failed to fetch branding')
    }
    
    return await response.json()
}

/**
 * Fetch business information from API (public endpoint)
 * @returns {Promise<Object>} Business info (company name, contact, etc.)
 */
async function fetchBusinessInfo() {
    const response = await fetch('/api/public/business-info')
    
    if (!response.ok) {
        throw new Error('Failed to fetch business info')
    }
    
    return await response.json()
}

/**
 * Composable for branding and business information using Vue Query
 * @returns {Object} Branding state
 */
export function useBranding() {
    // Query: Fetch branding (logo, etc.)
    const {
        data: branding,
        isLoading: isLoadingBranding,
        error: brandingError,
        refetch: refetchBranding
    } = useQuery({
        queryKey: ['branding'],
        queryFn: fetchBranding,
        staleTime: 10 * 60 * 1000, // 10 minutes (rarely changes)
        cacheTime: 30 * 60 * 1000, // 30 minutes
    })
    
    // Query: Fetch business info (public)
    const {
        data: businessInfo,
        isLoading: isLoadingBusinessInfo,
        error: businessInfoError,
        refetch: refetchBusinessInfo
    } = useQuery({
        queryKey: ['businessInfo'],
        queryFn: fetchBusinessInfo,
        staleTime: 10 * 60 * 1000, // 10 minutes (rarely changes)
        cacheTime: 30 * 60 * 1000, // 30 minutes
    })
    
    // Return reactive state and methods
    return {
        // Branding
        branding,
        isLoadingBranding,
        brandingError,
        refetchBranding,
        
        // Business Info
        businessInfo,
        isLoadingBusinessInfo,
        businessInfoError,
        refetchBusinessInfo
    }
}
