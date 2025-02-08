import { ref } from 'vue'

const storedUser = localStorage.getItem('currentUser')

// Initialize currentUser ref
export const currentUser = ref(null)

// If we have stored data, set it after a small delay to ensure reactivity is set up
if (storedUser) {
    try {
        const userData = JSON.parse(storedUser)
        // Set the user data immediately
        currentUser.value = userData
    } catch (err) {
        localStorage.removeItem('currentUser')
    }
}

export function setUser(user) {
    currentUser.value = user
    localStorage.setItem('currentUser', JSON.stringify(user))
}

export function clearUser() {
    currentUser.value = null
    localStorage.removeItem('currentUser')
} 