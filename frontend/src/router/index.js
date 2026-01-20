import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { defineAbilitiesFor } from '../utils/abilities'

const routes = [
    {
        path: '/',
        name: 'home',
        component: () => import('../views/HomePage.vue')
    },
    {
        path: '/account',
        component: () => import('../views/AccountPage.vue'),
        meta: { requiresAuth: true, bypassApprovalCheck: true }
    },
    {
        path: '/payments',
        component: () => import('../views/PaymentsPage.vue'),
        meta: { 
            requiresAuth: true,
            requiresApproval: true,
            permission: { action: 'access', subject: 'StudentPayments' }
        }
    },
    {
        path: '/admin/users',
        name: 'manage-users',
        component: () => import('../views/ManageUsersPage.vue'),
        meta: { 
            requiresAuth: true,
            permission: { action: 'manage', subject: 'User' }
        }
    },
    {
        path: '/admin/packages',
        name: 'manage-packages',
        component: () => import('../views/ManagePackagesPage.vue'),
        meta: { 
            requiresAuth: true,
            permission: { action: 'manage', subject: 'Package' }
        }
    },
    {
        path: '/admin/settings',
        name: 'admin-settings',
        component: () => import('../views/AdminSettingsPage.vue'),
        meta: { 
            requiresAuth: true,
            permission: { action: 'manage', subject: 'User' }
        }
    },
    {
        path: '/calendar',
        name: 'calendar',
        component: () => import('../views/CalendarPage.vue'),
        meta: { 
            requiresAuth: true,
            permission: { action: 'manage', subject: 'Calendar' }
        }
    },
    {
        path: '/book-lesson',
        name: 'book-lesson',
        component: () => import('../views/BookLessonPage.vue'),
        meta: { 
            requiresAuth: true,
            requiresApproval: true,
            permission: { action: 'create', subject: 'StudentBooking' }
        }
    },
    {
        path: '/auth/google/callback',
        name: 'google-auth-callback',
        component: () => import('../views/GoogleAuthCallback.vue'),
        meta: { requiresAuth: true }
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
    
    // Check approval requirement for students (unless route explicitly bypasses)
    if (userStore.user && to.meta.requiresApproval && !to.meta.bypassApprovalCheck) {
        const verificationStatus = userStore.user.verification_status
        
        // Only enforce for students
        if (userStore.user.role === 'student' && verificationStatus) {
            // If user can't access (incomplete profile or not approved), redirect to account
            if (!verificationStatus.canAccess) {
                next('/account')
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