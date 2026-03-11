import { watch } from 'vue'
import { useBranding } from './useBranding'

/**
 * Composable to dynamically update page title and favicon
 * based on business branding settings
 */
export function usePageMeta() {
    const { branding } = useBranding()
    
    // Update page title when company name changes
    watch(
        () => branding.value?.companyName,
        (companyName) => {
            if (companyName) {
                document.title = companyName
            }
        },
        { immediate: true }
    )
    
    // Update favicon when logo changes
    watch(
        () => branding.value?.logoUrl,
        (logoUrl) => {
            if (logoUrl) {
                updateFavicon(logoUrl)
            }
        },
        { immediate: true }
    )
}

/**
 * Update the favicon link element
 * @param {string} iconUrl - URL to the favicon image
 */
function updateFavicon(iconUrl) {
    // Remove existing favicon links
    const existingLinks = document.querySelectorAll("link[rel*='icon']")
    existingLinks.forEach(link => link.remove())
    
    // Create new favicon link
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/x-icon'
    link.href = iconUrl
    
    // Add to document head
    document.head.appendChild(link)
}
