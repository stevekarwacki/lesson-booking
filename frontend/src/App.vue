<script setup>
import { ref, onMounted } from 'vue'
import SignupForm from './components/SignupForm.vue'
import LoginForm from './components/LoginForm.vue'
import NavBar from './components/NavBar.vue'
import { currentUser, clearUser } from './stores/userStore'

const handleLogout = () => {
    clearUser()
}
</script>

<template>
    <div class="app">
        <NavBar @logout="handleLogout" />
        <div class="container">
            <main class="main-content">
                <template v-if="!currentUser">
                    <div class="auth-forms">
                        <LoginForm />
                        <SignupForm />
                    </div>
                </template>
                <template v-else>
                    <router-view></router-view>
                </template>
            </main>
        </div>
    </div>
</template>

<style scoped>
.app {
    min-height: 100vh;
    background: var(--background-color);
}

.main-content {
    min-height: calc(100vh - 70px); /* Adjust based on navbar height */
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
}

/* Move navbar outside container for full-width */
.navbar {
    width: 100%;
    margin-bottom: var(--spacing-lg);
}
</style>
