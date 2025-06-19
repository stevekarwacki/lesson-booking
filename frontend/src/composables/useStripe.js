// Create a composable for Stripe functionality
import { ref } from 'vue'
import { loadStripe } from '@stripe/stripe-js'
import { useUserStore } from '../stores/userStore'

export function useStripe() {
    const stripe = ref(null)
    const elements = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const userStore = useUserStore()

    const initializeStripe = async () => {
        try {
            // Fetch publishable key from backend
            const response = await fetch('/api/stripe-key')
            if (!response.ok) {
                throw new Error('Failed to fetch Stripe configuration')
            }
            
            const { publishableKey } = await response.json()
            if (!publishableKey) {
                throw new Error('Stripe publishable key is not configured')
            }
            
            stripe.value = await loadStripe(publishableKey)
            return stripe.value
        } catch (err) {
            error.value = err.message
            throw err
        }
    }

    const createPaymentIntent = async (amount, planId) => {
        try {
            loading.value = true
            const response = await fetch('/api/payments/create-payment-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userStore.token}`
                },
                body: JSON.stringify({ amount, planId })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to create payment intent')
            }

            return await response.json()
        } catch (err) {
            error.value = err.message
            throw err
        } finally {
            loading.value = false
        }
    }

    const mountPaymentElement = async (element, amount, mode = 'payment') => {
        try {
            if (!stripe.value) {
                await initializeStripe()
            }

            const options = {
                mode: mode,
                currency: 'usd',
                paymentMethodCreation: 'manual',
                appearance: {
                    theme: 'stripe',
                    variables: {
                        colorPrimary: '#4F46E5',
                        colorBackground: '#ffffff',
                        colorText: '#1F2937',
                        colorDanger: '#EF4444',
                        fontFamily: 'system-ui, sans-serif',
                        spacingUnit: '4px',
                        borderRadius: '4px'
                    },
                    rules: {
                        '.Input': {
                            padding: '12px',
                            fontSize: '16px'
                        },
                        '.Input:focus': {
                            borderColor: '#4F46E5'
                        }
                    }
                }
            }

            // Add amount for both payment and subscription modes
            // Stripe requires amount for validation even in subscription mode
            if (amount) {
                options.amount = Math.round(amount * 100) // Convert to cents
            }

            elements.value = stripe.value.elements(options)

            const paymentElement = elements.value.create('payment', {
                layout: {
                    type: 'tabs',
                    defaultCollapsed: false
                }
            })
            await paymentElement.mount(element)
            return paymentElement
        } catch (err) {
            error.value = err.message
            throw err
        }
    }

    return {
        stripe,
        elements,
        loading,
        error,
        initializeStripe,
        createPaymentIntent,
        mountPaymentElement
    }
}