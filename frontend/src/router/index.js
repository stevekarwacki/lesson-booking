import { createRouter, createWebHistory } from 'vue-router'
import ManageInstructorsPage from '../views/ManageInstructorsPage.vue'
import ManageUsersPage from '../views/ManageUsersPage.vue'
import ManagePackagesPage from '../views/ManagePackagesPage.vue'
import AccountPage from '../views/AccountPage.vue'
import InstructorCalendarPage from '../views/InstructorCalendarPage.vue'
import BookLessonPage from '../views/BookLessonPage.vue'
import ManageAvailabilityPage from '../views/ManageAvailabilityPage.vue'
import PaymentsPage from '../views/PaymentsPage.vue'
import { useUserStore } from '../stores/userStore'
// Import other views as needed

const routes = [
    {
        path: '/',
        name: 'home',
        component: () => import('../views/HomePage.vue')
    },
    {
        path: '/account',
        component: AccountPage,
        meta: { requiresAuth: true }
    },
    {
        path: '/payments',
        component: PaymentsPage,
        meta: { requiresAuth: true }
    },
    {
        path: '/admin/instructors',
        name: 'manage-instructors',
        component: ManageInstructorsPage,
        meta: { requiresAdmin: true }
    },
    {
        path: '/admin/users',
        name: 'manage-users',
        component: ManageUsersPage,
        meta: { requiresAdmin: true }
    },
    {
        path: '/admin/packages',
        name: 'manage-packages',
        component: ManagePackagesPage,
        meta: { requiresAdmin: true }
    },
    {
        path: '/instructor/calendar',
        name: 'instructor-calendar',
        component: InstructorCalendarPage,
        meta: { requiresInstructor: true }
    },
    {
        path: '/book-lesson',
        name: 'book-lesson',
        component: BookLessonPage,
        meta: { requiresAuth: true }
    },
    {
        path: '/availability',
        name: 'manage-availability',
        component: ManageAvailabilityPage,
        meta: { requiresInstructor: true }
    },
    {
        path: '/admin/availability',
        name: 'admin-availability',
        component: ManageAvailabilityPage,
        meta: { requiresAdmin: true }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Updated navigation guard
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
    
    if (to.meta.requiresAuth && !userStore.user) {
        next('/')
    } else if (to.meta.requiresAdmin && (!userStore.user || userStore.user.role !== 'admin')) {
        next('/')
    } else if (to.meta.requiresInstructor && (!userStore.user || userStore.user.role !== 'instructor')) {
        next('/')
    } else {
        next()
    }
})

export default router 