import { defineStore } from 'pinia';
import axios from 'axios';

export const useUserStore = defineStore('user', {
    state: () => ({
        user: null,
        token: localStorage.getItem('token') || null,
        isAuthenticated: !!localStorage.getItem('token')
    }),

    getters: {
        isInstructor: (state) => state.user?.role === 'instructor',
        isAdmin: (state) => state.user?.role === 'admin',
        isStudent: (state) => state.user?.role === 'student'
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
                const response = await axios.post('/api/auth/register', userData);
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