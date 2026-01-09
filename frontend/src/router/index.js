import { createRouter, createWebHistory } from 'vue-router'
import ManageUsersPage from '../views/ManageUsersPage.vue'
import ManagePackagesPage from '../views/ManagePackagesPage.vue'
import AdminSettingsPage from '../views/AdminSettingsPage.vue'
import AccountPage from '../views/AccountPage.vue'
import CalendarPage from '../views/CalendarPage.vue'
import BookLessonPage from '../views/BookLessonPage.vue'
import PaymentsPage from '../views/PaymentsPage.vue'
import GoogleAuthCallback from '../views/GoogleAuthCallback.vue'
import PendingApprovalPage from '../views/PendingApprovalPage.vue'
import { useUserStore } from '../stores/userStore'
import { defineAbilitiesFor } from '../utils/abilities'
// Import other views as needed

const routes = [
    {
        path: '/',
        name: 'home',
        component: () => import('../views/HomePage.vue'),
        meta: { bypassVerificationCheck: true }
    },
    {
        path: '/account',
        component: AccountPage,
        meta: { requiresAuth: true }
    },
    {
        path: '/payments',
        component: PaymentsPage,
        meta: { 
            requiresAuth: true,
            permission: { action: 'access', subject: 'StudentPayments' }
        }
    },
    {
        path: '/admin/users',
        name: 'manage-users',
        component: ManageUsersPage,
        meta: { 
            requiresAuth: true,
            permission: { action: 'manage', subject: 'User' }
        }
    },
    {
        path: '/admin/packages',
        name: 'manage-packages',
        component: ManagePackagesPage,
        meta: { 
            requiresAuth: true,
            permission: { action: 'manage', subject: 'Package' }
        }
    },
    {
        path: '/admin/settings',
        name: 'admin-settings',
        component: AdminSettingsPage,
        meta: { 
            requiresAuth: true,
            permission: { action: 'manage', subject: 'User' }
        }
    },
    {
        path: '/calendar',
        name: 'calendar',
        component: CalendarPage,
        meta: { 
            requiresAuth: true,
            permission: { action: 'manage', subject: 'Calendar' }
        }
    },
    {
        path: '/book-lesson',
        name: 'book-lesson',
        component: BookLessonPage,
        meta: { 
            requiresAuth: true,
            permission: { action: 'create', subject: 'StudentBooking' }
        }
    },
    {
        path: '/auth/google/callback',
        name: 'google-auth-callback',
        component: GoogleAuthCallback,
        meta: { requiresAuth: true }
    },
    {
        path: '/verification',
        name: 'verification',
        component: PendingApprovalPage,
        meta: { requiresAuth: true, bypassVerificationCheck: true }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// CASL-based navigation guard
router.beforeEach(async (to, from, next) => {
    const userStore = useUserStore()
    
    // If we have a token but no user, wait for initialization
    if (userStore.token && !userStore.user) {
        try {
            await userStore.fetchUser()
        } catch (error) {
            console.error('Failed to fetch user:', error)
            userStore.clearUser()
            next('/')
            return
        }
    }
    
    // Check authentication requirement
    if (to.meta.requiresAuth && !userStore.user) {
        next('/')
        return
    }
    
    // Check verification status for authenticated users (unless bypassing)
    if (userStore.user && !to.meta.bypassVerificationCheck) {
        const verificationStatus = userStore.user.verification_status
        
        // Only enforce verification for students
        if (userStore.user.role === 'student' && verificationStatus) {
            // If verification incomplete or approval needed, redirect to verification page
            if (!verificationStatus.canAccess && to.path !== '/verification') {
                next('/verification')
                return
            }
        }
    }
    
    // Check CASL permissions
    if (to.meta.permission && userStore.user) {
        const ability = defineAbilitiesFor(userStore.user)
        const { action, subject, resource } = to.meta.permission
        
        if (!ability.can(action, subject, resource)) {
            // Redirect to appropriate page based on permissions
            if (userStore.canManageUsers) {
                next('/admin/users')
            } else if (userStore.canManageCalendar) {
                next('/calendar')
            } else {
                next('/book-lesson')
            }
            return
        }
    }
    
    next()
})

export default router 