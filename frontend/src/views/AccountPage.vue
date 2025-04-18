<template>
    <div class="account-page">
        <h1>Account</h1>
        
        <div class="account-sections">
            <section class="account-section">
                <Profile />
            </section>
        </div>
    </div>
</template>

<script setup>
import Profile from '../components/Profile.vue'
</script>

<style scoped>
.account-page {
    max-width: 1200px;
    margin: 0 auto;
}

h1 {
    margin-bottom: var(--spacing-lg);
    color: var(--secondary-color);
}

.account-sections {
    display: grid;
    gap: var(--spacing-lg);
}

.account-section {
    background: white;
    border-radius: var(--border-radius);
    padding: var(--spacing-lg);
    box-shadow: var(--card-shadow);
}

h2 {
    margin-top: 0;
    margin-bottom: var(--spacing-lg);
    color: var(--secondary-color);
}

@media (max-width: 768px) {
    .account-section {
        padding: var(--spacing-md);
    }
}
</style> 