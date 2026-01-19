<script setup>
import { ref, onMounted } from 'vue'
import SignupForm from './components/SignupForm.vue'
import LoginForm from './components/LoginForm.vue'
import NavBar from './components/NavBar.vue'
import AppFooter from './components/AppFooter.vue'
import ProfileStatusBanner from './components/ProfileStatusBanner.vue'
import { useUserStore } from './stores/userStore'
import { useSettingsStore } from './stores/settingsStore'
import { useTheme } from './composables/useTheme'
const userStore = useUserStore()
const settingsStore = useSettingsStore()

// Initialize theme system (will apply theme automatically via watcher)
useTheme()

onMounted(async () => {
    // Initialize stores in parallel for faster startup
    await Promise.all([
        userStore.initialize(),
        settingsStore.initialize()
    ])
})

const handleLogout = () => {
    userStore.clearUser()
}
</script>

<template>
    <div class="app">
        <NavBar @logout="handleLogout" />
        <ProfileStatusBanner v-if="userStore.user" />
        <div class="container">
            <main class="main-content">
                <router-view v-if="userStore.token"></router-view>
                <div v-else class="auth-forms">
                    <LoginForm />
                    <SignupForm />
                </div>
            </main>
        </div>
        <AppFooter />
    </div>
</template>

<style scoped>
.app {
    min-height: 100vh;
    background: var(--background-color);
    display: flex;
    flex-direction: column;
}

.container {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.main-content {
    flex: 1;
    margin-bottom: var(--spacing-xl, 2rem); /* Add margin between main content and footer */
}

.auth-forms {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
}

@media (max-width: 768px) {
    .auth-forms {
        grid-template-columns: 1fr;
    }
    
    .main-content {
        margin-bottom: var(--spacing-lg, 1.5rem); /* Reduce margin on mobile */
    }
}
</style>
