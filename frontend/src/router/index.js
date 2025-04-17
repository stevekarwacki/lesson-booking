import { createRouter, createWebHistory } from 'vue-router'
import ManageInstructorsPage from '../views/ManageInstructorsPage.vue'
import ManageUsersPage from '../views/ManageUsersPage.vue'
import AccountPage from '../views/AccountPage.vue'
import InstructorCalendarPage from '../views/InstructorCalendarPage.vue'
import BookLessonPage from '../views/BookLessonPage.vue'
import ManageAvailabilityPage from '../views/ManageAvailabilityPage.vue'
import { currentUser } from '../stores/userStore'
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
    await new Promise(resolve => setTimeout(resolve, 300))
    
    if (to.meta.requiresAuth && !currentUser.value) {
        next('/')
        return
    } 
    
    if (to.meta.requiresAdmin && (!currentUser.value || currentUser.value.role !== 'admin')) {
        next('/')
        return
    }
    
    if (to.meta.requiresInstructor && (!currentUser.value || currentUser.value.role !== 'instructor')) {
        next('/')
        return
    }
    
    next()
})

export default router 