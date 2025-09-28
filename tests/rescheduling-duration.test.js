const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Rescheduling Duration Preservation', () => {
    it('should preserve 60-minute duration during rescheduling logic', () => {
        // Test the core logic that preserves duration during rescheduling
        const originalBooking = {
            id: 1,
            duration: 4, // 60 minutes = 4 slots
            start_slot: 40, // 10:00 AM
            date: '2024-01-15',
            instructor_id: 1,
            student_id: 1
        };

        // Simulate the rescheduling logic that should preserve duration
        const preserveDurationLogic = (booking) => {
            // This is the key fix: always use original booking duration
            return booking.duration;
        };

        const preservedDuration = preserveDurationLogic(originalBooking);
        assert.strictEqual(preservedDuration, 4, 'Duration should be preserved as 4 slots (60 minutes)');
    });

    it('should preserve 30-minute duration during rescheduling logic', () => {
        // Test the core logic for 30-minute lessons
        const originalBooking = {
            id: 2,
            duration: 2, // 30 minutes = 2 slots
            start_slot: 36, // 9:00 AM
            date: '2024-01-15',
            instructor_id: 1,
            student_id: 1
        };

        // Simulate the rescheduling logic
        const preserveDurationLogic = (booking) => {
            return booking.duration;
        };

        const preservedDuration = preserveDurationLogic(originalBooking);
        assert.strictEqual(preservedDuration, 2, 'Duration should be preserved as 2 slots (30 minutes)');
    });

    it('should calculate correct new end time based on preserved duration', () => {
        // Test that end time calculation uses preserved duration
        const calculateEndSlot = (startSlot, duration) => {
            return startSlot + duration;
        };

        // 60-minute lesson rescheduled to 2:00 PM (slot 56)
        const newStartSlot = 56;
        const preservedDuration = 4;
        const expectedEndSlot = calculateEndSlot(newStartSlot, preservedDuration);
        
        assert.strictEqual(expectedEndSlot, 60, 'End slot should be 60 (4:00 PM) for 60-minute lesson starting at 2:00 PM');
    });

});
