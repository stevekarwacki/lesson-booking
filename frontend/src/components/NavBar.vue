<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'

const router = useRouter()
const userStore = useUserStore()
const isMenuOpen = ref(false)

// CASL-based permission checks
const canManageUsers = computed(() => userStore.canManageUsers)
const canManageInstructors = computed(() => userStore.canManageInstructors)
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
    <nav class="navbar">
        <div class="nav-brand">
            <h1>Lesson Booking App</h1>
            <button class="hamburger" @click="toggleMenu" :class="{ 'is-active': isMenuOpen }">
                <span class="hamburger-box">
                    <span class="hamburger-inner"></span>
                </span>
            </button>
        </div>

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
                <router-link 
                    v-if="canManageInstructors"
                    to="/admin/instructors" 
                    class="nav-link"
                    @click="closeMenu"
                >
                    Instructors
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
                <router-link 
                    v-if="canManageAllInstructorAvailability && $mq.lgPlus"
                    to="/admin/availability" 
                    class="nav-link"
                    @click="closeMenu"
                >
                    Instructor Availability
                </router-link>

                <!-- Calendar Management (Instructors only, not admins) -->
                <router-link 
                    v-if="canManageOwnInstructorCalendar"
                    to="/instructor/calendar" 
                    class="nav-link"
                    @click="closeMenu"
                >
                    My Calendar
                </router-link>
                <router-link 
                    v-if="canManageOwnInstructorAvailability && $mq.lgPlus"
                    to="/availability" 
                    class="nav-link"
                    @click="closeMenu"
                >
                    My Availability
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

            <div class="nav-auth">
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

.nav-brand {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.nav-brand h1 {
    margin: 0 0 0 10px;
    color: var(--primary-color);
    font-size: 1.5rem;
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

    .hamburger {
        display: block;
    }

    .nav-content {
        display: none;
        flex-direction: column;
        width: 100%;
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

    .nav-auth {
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