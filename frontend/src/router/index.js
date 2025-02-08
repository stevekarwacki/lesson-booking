import { createRouter, createWebHistory } from 'vue-router'
import ManageInstructorsPage from '../views/ManageInstructorsPage.vue'
import ManageUsersPage from '../views/ManageUsersPage.vue'
import { currentUser } from '../stores/userStore'
// Import other views as needed

const routes = [
    {
        path: '/',
        name: 'home',
        component: () => import('../views/HomePage.vue')
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
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Navigation guard for protected routes
router.beforeEach(async (to, from, next) => {
    // Wait for currentUser to be initialized from localStorage
    await new Promise(resolve => setTimeout(resolve, 300))
    
    if (to.meta.requiresAdmin) {
        if (!currentUser.value) {
            console.warn('Access denied: No user')
            next('/')
            return
        }
        
        if (currentUser.value.role !== 'admin') {
            console.warn('Access denied: Not admin')
            next('/')
            return
        }
        
        next()
    } else {
        next()
    }
})

export default router 