const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Booking Conflict Detection', () => {

    it('should detect conflict when 60-minute lesson overlaps existing 30-minute booking', () => {
        // Test the conflict detection logic
        const checkTimeConflict = (newStartSlot, newDuration, existingBookings) => {
            const newEndSlot = newStartSlot + newDuration;
            
            return existingBookings.some(booking => {
                const existingEndSlot = booking.start_slot + booking.duration;
                // Check if new booking overlaps with existing booking
                return (newStartSlot < existingEndSlot && newEndSlot > booking.start_slot);
            });
        };

        const existingBookings = [
            { start_slot: 40, duration: 2 } // 10:00 AM - 10:30 AM (30-minute booking)
        ];

        // Try to book 60-minute lesson from 9:30 AM - 10:30 AM (slots 38-42)
        const hasConflict = checkTimeConflict(38, 4, existingBookings);
        assert.strictEqual(hasConflict, true, 'Should detect conflict when 60-minute lesson overlaps existing booking');
    });

    it('should detect conflict when 60-minute lesson starts at same time as existing booking', () => {
        const checkTimeConflict = (newStartSlot, newDuration, existingBookings) => {
            const newEndSlot = newStartSlot + newDuration;
            
            return existingBookings.some(booking => {
                const existingEndSlot = booking.start_slot + booking.duration;
                return (newStartSlot < existingEndSlot && newEndSlot > booking.start_slot);
            });
        };

        const existingBookings = [
            { start_slot: 40, duration: 2 } // 10:00 AM - 10:30 AM
        ];

        // Try to book 60-minute lesson starting at same time (10:00 AM - 11:00 AM, slots 40-44)
        const hasConflict = checkTimeConflict(40, 4, existingBookings);
        assert.strictEqual(hasConflict, true, 'Should detect conflict when 60-minute lesson starts at same time');
    });

    it('should allow 60-minute lesson when no conflicts exist', () => {
        const checkTimeConflict = (newStartSlot, newDuration, existingBookings) => {
            const newEndSlot = newStartSlot + newDuration;
            
            return existingBookings.some(booking => {
                const existingEndSlot = booking.start_slot + booking.duration;
                return (newStartSlot < existingEndSlot && newEndSlot > booking.start_slot);
            });
        };

        const existingBookings = [
            { start_slot: 40, duration: 2 } // 10:00 AM - 10:30 AM
        ];

        // Book 60-minute lesson at 11:00 AM - 12:00 PM (slots 44-48, no conflict)
        const hasConflict = checkTimeConflict(44, 4, existingBookings);
        assert.strictEqual(hasConflict, false, 'Should allow 60-minute lesson when no conflicts exist');
    });

    it('should detect partial overlap conflicts', () => {
        const checkTimeConflict = (newStartSlot, newDuration, existingBookings) => {
            const newEndSlot = newStartSlot + newDuration;
            
            return existingBookings.some(booking => {
                const existingEndSlot = booking.start_slot + booking.duration;
                return (newStartSlot < existingEndSlot && newEndSlot > booking.start_slot);
            });
        };

        const existingBookings = [
            { start_slot: 40, duration: 2 } // 10:00 AM - 10:30 AM
        ];

        // Try to book 60-minute lesson from 10:15 AM - 11:15 AM (partial overlap)
        const hasConflict = checkTimeConflict(41, 4, existingBookings);
        assert.strictEqual(hasConflict, true, 'Should detect partial overlap conflicts');
    });

    it('should handle multiple existing bookings', () => {
        const checkTimeConflict = (newStartSlot, newDuration, existingBookings) => {
            const newEndSlot = newStartSlot + newDuration;
            
            return existingBookings.some(booking => {
                const existingEndSlot = booking.start_slot + booking.duration;
                return (newStartSlot < existingEndSlot && newEndSlot > booking.start_slot);
            });
        };

        const existingBookings = [
            { start_slot: 36, duration: 2 }, // 9:00 AM - 9:30 AM
            { start_slot: 40, duration: 2 }, // 10:00 AM - 10:30 AM
            { start_slot: 48, duration: 2 }  // 12:00 PM - 12:30 PM
        ];

        // Try to book 60-minute lesson that would conflict with middle booking
        const hasConflict = checkTimeConflict(38, 4, existingBookings);
        assert.strictEqual(hasConflict, true, 'Should detect conflicts with multiple existing bookings');

        // Try to book in a clear slot
        const noConflict = checkTimeConflict(42, 4, existingBookings);
        assert.strictEqual(noConflict, false, 'Should allow booking in clear time slot');
    });
});
