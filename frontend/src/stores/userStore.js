import { defineStore } from 'pinia';
import axios from 'axios';
import { subject } from '@casl/ability';
import { defineAbilitiesFor } from '@/utils/abilities';

export const useUserStore = defineStore('user', {
    state: () => ({
        user: null,
        token: localStorage.getItem('token') || null,
        isAuthenticated: !!localStorage.getItem('token')
    }),

    getters: {
        // Legacy role-based getters (deprecated - use CASL permissions instead)
        isInstructor: (state) => state.user?.role === 'instructor',
        isAdmin: (state) => state.user?.role === 'admin',
        isStudent: (state) => state.user?.role === 'student',
        
        // CASL ability instance
        ability: (state) => state.user ? defineAbilitiesFor(state.user) : null,
        
        // CASL-based permission getters
        canManageUsers: (state) => state.user ? defineAbilitiesFor(state.user).can('manage', 'User') : false,
        canManageInstructors: (state) => state.user ? defineAbilitiesFor(state.user).can('manage', 'Instructor') : false,
        canManagePackages: (state) => state.user ? defineAbilitiesFor(state.user).can('manage', 'Package') : false,
        canManageCalendar: (state) => state.user ? defineAbilitiesFor(state.user).can('manage', 'Calendar') : false,
        canManageAvailability: (state) => state.user ? defineAbilitiesFor(state.user).can('manage', 'Availability') : false,
        canCreateBooking: (state) => state.user ? defineAbilitiesFor(state.user).can('create', 'Booking') : false,
        
        // Granular availability permissions
        canManageAllInstructorAvailability: (state) => state.user ? defineAbilitiesFor(state.user).can('manage', 'AllInstructorAvailability') : false,
        canManageOwnInstructorAvailability: (state) => state.user ? defineAbilitiesFor(state.user).can('manage', 'OwnInstructorAvailability') : false,
        
        // Payment permissions
        canAccessPayments: (state) => state.user ? defineAbilitiesFor(state.user).can('read', 'Credits') : false,
        canAccessStudentPayments: (state) => state.user ? defineAbilitiesFor(state.user).can('access', 'StudentPayments') : false,
        
        // Role-specific permissions (exclude admins)
        canCreateStudentBooking: (state) => state.user ? defineAbilitiesFor(state.user).can('create', 'StudentBooking') : false,
        canManageOwnInstructorCalendar: (state) => state.user ? defineAbilitiesFor(state.user).can('manage', 'OwnInstructorCalendar') : false,
        
        // User role editing permissions
        canEditUserRole: (state) => state.user ? defineAbilitiesFor(state.user).can('edit', 'UserRole') : false,
        
        // Refund permissions
        canRefundBooking: (state) => state.user ? defineAbilitiesFor(state.user).can('refund', 'Booking') : false,
        
        // Helper method to check if we can edit a specific user's role
        canEditSpecificUserRole: (state) => (targetUser) => {
            if (!state.user || !targetUser) return false;
            const ability = defineAbilitiesFor(state.user);
            return ability.can('edit', 'UserRole') && ability.can('edit', subject('UserRole', targetUser));
        }
    },

    actions: {
        setUser(userData) {
            this.user = userData;
        },

        clearUser() {
            this.user = null;
            this.token = null;
            this.isAuthenticated = false;
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
        },

        async login(email, password) {
            try {
                const response = await axios.post('/api/auth/login', { email, password });
                const { token, user } = response.data;
                
                this.token = token;
                this.user = user;
                this.isAuthenticated = true;
                
                localStorage.setItem('token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                
                return true;
            } catch (error) {
                console.error('Login failed:', error);
                return false;
            }
        },

        async register(userData) {
            try {
                const response = await axios.post('/api/auth/signup', userData);
                const { token, user } = response.data;
                
                this.token = token;
                this.user = user;
                this.isAuthenticated = true;
                
                localStorage.setItem('token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                
                return true;
            } catch (error) {
                console.error('Registration failed:', error);
                return false;
            }
        },

        async fetchUser() {
            if (!this.token) return;
            
            try {
                const response = await axios.get('/api/auth/me');
                this.user = response.data;
            } catch (error) {
                console.error('Failed to fetch user:', error);
                this.clearUser();
            }
        },

        initialize() {
            if (this.token) {
                axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
                this.fetchUser();
            }
        }
    }
}); 