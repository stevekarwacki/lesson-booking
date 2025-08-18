import { defineStore } from 'pinia';

export const useScheduleStore = defineStore('schedule', {
    state: () => ({
        // Track when schedules need to be refreshed
        refreshTrigger: 0,
        // Track specific instructor schedules that need refreshing
        instructorsToRefresh: new Set()
    }),

    actions: {
        // Trigger a global refresh of all schedules
        triggerGlobalRefresh() {
            this.refreshTrigger += 1;
            console.log('Schedule store: Triggering global schedule refresh');
        },

        // Trigger refresh for a specific instructor's schedule
        triggerInstructorRefresh(instructorId) {
            this.instructorsToRefresh.add(instructorId);
            this.refreshTrigger += 1;
            console.log(`Schedule store: Triggering refresh for instructor ${instructorId}`);
        },

        // Mark an instructor's schedule as refreshed
        markInstructorRefreshed(instructorId) {
            this.instructorsToRefresh.delete(instructorId);
        },

        // Check if a specific instructor needs refresh
        needsRefresh(instructorId) {
            return this.instructorsToRefresh.has(instructorId);
        }
    }
});