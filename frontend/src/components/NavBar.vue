<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { useSettingsStore } from '../stores/settingsStore'

const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const isMenuOpen = ref(false)

// Logo state
const logoBaseUrl = ref('')
const companyName = ref('')
const logoPosition = ref('left')

// Computed property for versioned logo URL
const logoUrl = computed(() => {
  return settingsStore.versionedLogoUrl(logoBaseUrl.value)
})

// Fetch branding information
const fetchBrandingInfo = async () => {
  try {
    const response = await fetch('/api/branding')
    if (response.ok) {
      const branding = await response.json()
      if (branding.logoUrl) {
        logoBaseUrl.value = branding.logoUrl
      }
      if (branding.companyName) {
        companyName.value = branding.companyName
      }
      if (branding.logoPosition) {
        logoPosition.value = branding.logoPosition
      }
    }
  } catch (error) {
    console.warn('Could not fetch branding information:', error.message)
  }
}

// Initialize on mount
onMounted(() => {
  fetchBrandingInfo()
})

// CASL-based permission checks
const canManageUsers = computed(() => userStore.canManageUsers)
const canManagePackages = computed(() => userStore.canManagePackages)
const canManageCalendar = computed(() => userStore.canManageCalendar)
const canManageAvailability = computed(() => userStore.canManageAvailability)
const canCreateBooking = computed(() => userStore.canCreateBooking)

// Granular availability permissions
const canManageAllInstructorAvailability = computed(() => userStore.canManageAllInstructorAvailability)
const canManageOwnInstructorAvailability = computed(() => userStore.canManageOwnInstructorAvailability)

// Payment permissions
const canAccessPayments = computed(() => userStore.canAccessPayments)
const canAccessStudentPayments = computed(() => userStore.canAccessStudentPayments)

// Role-specific permissions (exclude admins)
const canCreateStudentBooking = computed(() => userStore.canCreateStudentBooking)
const canManageOwnInstructorCalendar = computed(() => userStore.canManageOwnInstructorCalendar)

// Legacy role checks (for specific business logic like approval)
const isStudentUnapproved = () => userStore.user?.role === 'student' && !userStore.user?.is_approved

const toggleMenu = () => {
    isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
    isMenuOpen.value = false
}

const handleLogout = () => {
    userStore.clearUser()
    router.push('/')
    isMenuOpen.value = false
}
</script>

<template>
    <nav class="navbar" :class="`logo-${logoPosition}`">
        <!-- Mobile: Brand area with hamburger -->
        <div class="nav-brand-mobile">
            <router-link to="/" class="brand-link" @click="closeMenu">
                <img 
                    v-if="logoUrl" 
                    :src="logoUrl" 
                    :alt="companyName + ' logo'"
                    class="brand-logo"
                />
                <h1 v-if="!logoUrl" class="brand-text">{{ companyName }}</h1>
            </router-link>
            <button class="hamburger" @click="toggleMenu" :class="{ 'is-active': isMenuOpen }">
                <span class="hamburger-box">
                    <span class="hamburger-inner"></span>
                </span>
            </button>
        </div>

        <!-- Desktop: Three-column grid layout -->
        <div class="nav-grid-desktop">
            <!-- Left column: Logo (if left position) + Company name -->
            <div class="nav-left">
                <router-link to="/" class="brand-link" @click="closeMenu">
                    <img 
                        v-if="logoUrl && logoPosition === 'left'" 
                        :src="logoUrl" 
                        :alt="companyName + ' logo'"
                        class="brand-logo"
                    />
                    <h1 class="brand-text">{{ companyName }}</h1>
                </router-link>
            </div>
            
            <!-- Center column: Logo (if center position) -->
            <div class="nav-center">
                <router-link to="/" class="brand-link" @click="closeMenu" v-if="logoPosition === 'center'">
                    <img 
                        v-if="logoUrl" 
                        :src="logoUrl" 
                        :alt="companyName + ' logo'"
                        class="brand-logo"
                    />
                    <h1 v-if="!logoUrl" class="brand-text">{{ companyName }}</h1>
                </router-link>
            </div>
            
            <!-- Right column: User info + logout -->
            <div class="nav-right">
                <div class="nav-auth" v-if="userStore.user">
                    <span class="user-name">{{ userStore.user.name }}</span>
                    <button @click="handleLogout" class="logout-button">
                        Log Out
                    </button>
                </div>
            </div>
        </div>

        <!-- Mobile/Desktop: Collapsible navigation content -->
        <div class="nav-content" :class="{ 'is-open': isMenuOpen }">
            <div class="nav-links" v-if="userStore.user" @click="closeMenu">
                <template v-if="isStudentUnapproved()">
                    <router-link to="/" class="nav-link">
                        Home
                    </router-link>
                </template>
                
                <!-- Admin Management Links -->
                <router-link 
                    v-if="canManageUsers"
                    to="/admin/users" 
                    class="nav-link"
                    @click="closeMenu"
                >
                    Users
                </router-link>
                
                <!-- Calendar Management (Instructors and Admins) -->
                <router-link 
                    v-if="canManageOwnInstructorCalendar || canManageUsers"
                    to="/calendar" 
                    class="nav-link"
                    @click="closeMenu"
                >
                    Calendar
                </router-link>
                
                <router-link 
                    v-if="canManagePackages"
                    to="/admin/packages" 
                    class="nav-link"
                    @click="closeMenu"
                >
                    Packages
                </router-link>
                <router-link 
                    v-if="canManageUsers"
                    to="/admin/settings" 
                    class="nav-link"
                    @click="closeMenu"
                >
                    Settings
                </router-link>

                <!-- Student/Booking Links -->
                <router-link 
                    v-if="canCreateStudentBooking && userStore.user?.is_approved"
                    to="/book-lesson" 
                    class="nav-link"
                >
                    Book Lesson
                </router-link>

                <router-link 
                    v-if="canAccessStudentPayments && userStore.user?.is_approved"
                    to="/payments" 
                    class="nav-link"
                >
                    Payments
                </router-link>

                <!-- Common Links for logged-in users -->
                <router-link to="/account" class="nav-link">
                    Account
                </router-link>
            </div>

            <!-- Mobile: Auth section in collapsible menu -->
            <div class="nav-auth nav-auth-mobile">
                <template v-if="userStore.user">
                    <span class="user-name">{{ userStore.user.name }}</span>
                    <button @click="handleLogout" class="logout-button">
                        Log Out
                    </button>
                </template>
            </div>
        </div>
    </nav>
</template>

<style scoped>
.navbar {
    box-sizing: border-box;
    width: 100%;
    margin-bottom: var(--spacing-lg);
    padding: 1rem var(--spacing-lg);
    background: white;
    box-shadow: var(--card-shadow);
    position: sticky;
    top: 0;
    z-index: 1000;
}

/* Mobile: Brand area with hamburger (hidden on desktop) */
.nav-brand-mobile {
    display: none;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

/* Desktop: Three-column grid layout (hidden on mobile) */
.nav-grid-desktop {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    width: 100%;
    gap: var(--spacing-md);
}

.nav-left {
    justify-self: start;
}

.nav-center {
    justify-self: center;
}

.nav-right {
    justify-self: end;
}

/* Desktop: Navigation content (below the grid header) */
.nav-content {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: var(--spacing-sm);
    border-top: 1px solid #eee;
    padding-top: var(--spacing-sm);
}

/* Desktop: Hide mobile auth section */
.nav-auth-mobile {
    display: none;
}

/* Desktop: Ensure nav-content auth is hidden */
.nav-content .nav-auth {
    display: none;
}

.brand-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: inherit;
    margin-left: 10px;
}

.brand-link:hover {
    text-decoration: none;
}

.brand-logo {
    max-height: 80px;
    max-width: 160px;
    height: auto;
    object-fit: contain;
}

.brand-text {
    margin: 0;
    color: var(--primary-color);
    font-size: 1.5rem;
    font-weight: 600;
}

/* Fallback for when there's no logo */
.brand-link:not(:has(.brand-logo)) .brand-text {
    margin-left: 0;
}

.nav-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.nav-links {
    display: flex;
    gap: var(--spacing-md);
    align-items: center;
}

.nav-link {
    color: var(--secondary-color);
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: var(--border-radius);
    transition: all 0.2s;
}

.nav-link:hover {
    background: #f5f5f5;
    color: var(--primary-color);
}

.router-link-active {
    color: var(--primary-color);
    font-weight: 500;
}

.nav-auth {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
}

.user-name {
    color: var(--secondary-color);
}

.logout-button {
    padding: 8px 16px;
    background: transparent;
    color: var(--primary-color);
    border: 1px solid var(--primary-color);
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: all 0.2s;
}

.logout-button:hover {
    background: var(--primary-color);
    color: white;
}

/* Hamburger menu styles */
.hamburger {
    display: none;
    padding: 10px 10px 0;
    background: none;
    border: none;
    cursor: pointer;
}

.hamburger-box {
    position: relative;
    display: inline-block;
    width: 24px;
    height: 20px;
}

.hamburger-inner {
    position: absolute;
    width: 24px;
    height: 2px;
    background-color: var(--primary-color);
    transition: all 0.3s;
    top: 6px;
    left: 0;
}

.hamburger-inner::before,
.hamburger-inner::after {
    content: '';
    position: absolute;
    width: 24px;
    height: 2px;
    background-color: var(--primary-color);
    transition: all 0.3s;
    left: 0;
}

.hamburger-inner::before {
    top: -8px;
}

.hamburger-inner::after {
    bottom: -8px;
}

/* Hamburger animation */
.hamburger.is-active .hamburger-inner {
    transform: rotate(45deg);
}

.hamburger.is-active .hamburger-inner::before {
    top: 0;
    opacity: 0;
}

.hamburger.is-active .hamburger-inner::after {
    bottom: 0;
    transform: rotate(-90deg);
}

@media (max-width: 768px) {
    .navbar {
        padding: var(--spacing-sm);
    }

    /* Mobile: Show brand area with hamburger */
    .nav-brand-mobile {
        display: flex;
    }

    /* Mobile: Hide desktop grid */
    .nav-grid-desktop {
        display: none;
    }

    /* Mobile: Show hamburger */
    .hamburger {
        display: block;
    }

    /* Mobile: Collapsible navigation */
    .nav-content {
        display: none;
        flex-direction: column;
        width: 100%;
        padding-top: var(--spacing-md);
        margin-top: 0;
        border-top: none;
        padding-top: var(--spacing-md);
    }

    .nav-content.is-open {
        display: flex;
    }

    .nav-links {
        flex-direction: column;
        width: 100%;
        gap: 0;
    }

    .nav-link {
        width: 100%;
        text-align: center;
        padding: 1rem;
        border-radius: 0;
        border-bottom: 1px solid #eee;
    }

    /* Mobile: Show auth section in collapsed menu */
    .nav-content .nav-auth-mobile {
        display: flex !important;
        width: 100%;
        justify-content: center;
        padding: var(--spacing-md) 0;
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    .logout-button {
        width: 100%;
    }

    .user-name {
        text-align: center;
    }
}
</style>
