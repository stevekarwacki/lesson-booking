import axios from 'axios';
import { useUserStore } from '../stores/userStore';
import { fromString, createDateHelper } from '../utils/dateHelpers.js';

const LAST_UPDATE_KEY = 'subscription_periods_last_update';
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function useSubscriptionUpdate() {
    const userStore = useUserStore();

    const shouldUpdate = () => {
        // First check if subscription period has ended using date helpers
        const subscription = userStore.user?.subscription;
        if (subscription) {
            const periodEndHelper = fromString(subscription.current_period_end);
            const nowHelper = createDateHelper();
            
            // Use business logic helper for subscription status check
            if (!nowHelper.isSubscriptionActive(periodEndHelper)) {
                return true;
            }
        }

        // Then check localStorage using date helpers
        const nextUpdate = localStorage.getItem(LAST_UPDATE_KEY);
        if (!nextUpdate) {
            return true;
        }
        
        const nextUpdateTime = parseInt(nextUpdate);
        const nowHelper = createDateHelper();
        return nowHelper.toTimestamp() >= nextUpdateTime;
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
                const nowHelper = createDateHelper();
                const nextUpdate = nowHelper.addDays(1).toTimestamp(); // Add 24 hours using date helper
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