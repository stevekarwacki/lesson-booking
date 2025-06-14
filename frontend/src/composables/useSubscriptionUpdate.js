import axios from 'axios';
import { useUserStore } from '../stores/userStore';

const LAST_UPDATE_KEY = 'subscription_periods_last_update';
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function useSubscriptionUpdate() {
    const userStore = useUserStore();

    const shouldUpdate = () => {
        // First check if subscription period has ended
        const subscription = userStore.user?.subscription;
        if (subscription) {
            const periodEnd = new Date(subscription.current_period_end);
            const now = new Date();
            const isPeriodEnded = periodEnd <= now;
            if (isPeriodEnded) {
                return true;
            }
        }

        // Then check localStorage
        const nextUpdate = localStorage.getItem(LAST_UPDATE_KEY);
        if (!nextUpdate) {
            return true;
        }
        
        const nextUpdateTime = parseInt(nextUpdate);
        const now = Date.now();
        return now >= nextUpdateTime;
    };

    const updateSubscriptionPeriods = async () => {
        if (!shouldUpdate()) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                return;
            }

            const response = await axios.post('/api/subscriptions/update-periods', null, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.data.success && response.data.updated) {
                const nextUpdate = Date.now() + UPDATE_INTERVAL;
                localStorage.setItem(LAST_UPDATE_KEY, nextUpdate.toString());
                await userStore.fetchUser();
            }
        } catch (error) {
            console.error('Error updating subscription periods:', error);
        }
    };

    return {
        updateSubscriptionPeriods
    };
} 