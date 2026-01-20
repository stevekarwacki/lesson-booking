import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '@/stores/userStore'

/**
 * Fetch all packages from API
 * @param {string} token - Auth token
 * @returns {Promise<Array>} Packages list
 */
async function fetchPackages(token) {
    const response = await fetch('/api/admin/packages', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    if (!response.ok) {
        throw new Error('Failed to load packages')
    }
    
    return await response.json()
}

/**
 * Create package via API
 * @param {Object} packageData - Package data
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Created package
 */
async function createPackageApi(packageData, token) {
    const response = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(packageData)
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to create package')
    }
    
    return data
}

/**
 * Update package via API
 * @param {number} packageId - Package ID
 * @param {Object} packageData - Updated package data
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Updated package
 */
async function updatePackageApi(packageId, packageData, token) {
    const response = await fetch(`/api/admin/packages/${packageId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(packageData)
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to update package')
    }
    
    return data
}

/**
 * Delete package via API
 * @param {number} packageId - Package ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Deletion result
 */
async function deletePackageApi(packageId, token) {
    const response = await fetch(`/api/admin/packages/${packageId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to delete package')
    }
    
    return data
}

/**
 * Composable for managing packages using Vue Query
 * Admin-only functionality
 * @returns {Object} Packages state and methods
 */
export function usePackages() {
    const userStore = useUserStore()
    const queryClient = useQueryClient()
    const token = computed(() => userStore.token)
    
    // Query: Fetch all packages
    const {
        data: packages,
        isLoading: isLoadingPackages,
        error: packagesError,
        refetch: refetchPackages
    } = useQuery({
        queryKey: ['packages'],
        queryFn: () => fetchPackages(token.value),
        enabled: computed(() => !!token.value && userStore.user?.role === 'admin'),
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 30 * 60 * 1000, // 30 minutes
    })
    
    // Mutation: Create package
    const createPackageMutation = useMutation({
        mutationFn: (packageData) => createPackageApi(packageData, token.value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['packages'] })
            // Also invalidate payment plans since they're related
            queryClient.invalidateQueries({ queryKey: ['paymentPlans'] })
        }
    })
    
    // Mutation: Update package
    const updatePackageMutation = useMutation({
        mutationFn: ({ packageId, packageData }) => 
            updatePackageApi(packageId, packageData, token.value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['packages'] })
            queryClient.invalidateQueries({ queryKey: ['paymentPlans'] })
        }
    })
    
    // Mutation: Delete package
    const deletePackageMutation = useMutation({
        mutationFn: (packageId) => deletePackageApi(packageId, token.value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['packages'] })
            queryClient.invalidateQueries({ queryKey: ['paymentPlans'] })
        }
    })
    
    // Methods
    const invalidatePackages = () => {
        queryClient.invalidateQueries({ queryKey: ['packages'] })
    }
    
    // Return reactive state and methods
    return {
        // State
        packages,
        isLoadingPackages,
        packagesError,
        
        // Mutations
        createPackage: createPackageMutation.mutateAsync,
        updatePackage: updatePackageMutation.mutateAsync,
        deletePackage: deletePackageMutation.mutateAsync,
        isCreatingPackage: createPackageMutation.isPending,
        isUpdatingPackage: updatePackageMutation.isPending,
        isDeletingPackage: deletePackageMutation.isPending,
        
        // Methods
        refetchPackages,
        invalidatePackages
    }
}
