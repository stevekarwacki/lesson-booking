<script setup>
import { ref, onMounted } from 'vue'
import SignupForm from './components/SignupForm.vue'
import LoginForm from './components/LoginForm.vue'
import NavBar from './components/NavBar.vue'
import AppFooter from './components/AppFooter.vue'
import { useUserStore } from './stores/userStore'
import SubscriptionPeriodUpdater from './components/SubscriptionPeriodUpdater.vue'

const userStore = useUserStore()

onMounted(() => {
    userStore.initialize()
})

const handleLogout = () => {
    userStore.clearUser()
}
</script>

<template>
    <div class="app">
        <NavBar @logout="handleLogout" />
        <div class="container">
            <main class="main-content">
                <SubscriptionPeriodUpdater />
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
}

.main-content {
    min-height: calc(100vh - 70px - 200px); /* Adjust based on navbar and footer height */
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
        min-height: calc(100vh - 70px - 300px); /* More space for mobile footer */
    }
}
</style>
