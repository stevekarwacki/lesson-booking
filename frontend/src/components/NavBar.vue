<script setup>
import { ref } from 'vue'
import { currentUser, clearUser } from '../stores/userStore'
import { useRouter } from 'vue-router'

const router = useRouter()
const isMenuOpen = ref(false)

const isAdmin = () => currentUser.value?.role === 'admin'
const isInstructor = () => currentUser.value?.role === 'instructor'
const isStudent = () => currentUser.value?.role === 'student'

const toggleMenu = () => {
    isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
    isMenuOpen.value = false
}

const handleLogout = () => {
    clearUser()
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
            <div class="nav-links" v-if="currentUser" @click="closeMenu">
                <router-link to="/" class="nav-link">Home</router-link>
                
                <!-- Admin Links -->
                <template v-if="isAdmin()">
                    <router-link 
                        to="/admin/instructors" 
                        class="nav-link"
                        @click="closeMenu"
                    >
                        Manage Instructors
                    </router-link>
                    <router-link 
                        to="/admin/users" 
                        class="nav-link"
                        @click="closeMenu"
                    >
                        Manage Users
                    </router-link>
                    <router-link 
                        to="/admin/availability" 
                        class="nav-link"
                        @click="closeMenu"
                    >
                        Manage Availability
                    </router-link>
                </template>

                <!-- Instructor Links -->
                <template v-if="isInstructor()">
                    <router-link 
                        to="/instructor/calendar" 
                        class="nav-link"
                        @click="closeMenu"
                    >
                        My Calendar
                    </router-link>
                    <router-link 
                        to="/availability" 
                        class="nav-link"
                        @click="closeMenu"
                    >
                        My Availability
                    </router-link>
                </template>

                <!-- Student Links -->
                <template v-if="isStudent()">
                    <router-link to="/book-lesson" class="nav-link">
                        Book Lesson
                    </router-link>
                </template>

                <!-- Common Links for logged-in users -->
                <router-link to="/profile" class="nav-link">
                    Profile
                </router-link>
            </div>

            <div class="nav-auth">
                <template v-if="currentUser">
                    <span class="user-name">{{ currentUser.name }}</span>
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
    background: white;
    padding: 1rem var(--spacing-lg);
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
    margin: 0;
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
    padding: 10px;
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
}

.hamburger-inner::before,
.hamburger-inner::after {
    content: '';
    position: absolute;
    width: 24px;
    height: 2px;
    background-color: var(--primary-color);
    transition: all 0.3s;
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