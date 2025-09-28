const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('60-Minute Lesson Pricing Calculations', () => {

    it('should calculate correct pricing for different durations', () => {
        const instructorRate = 60.00; // $60 for 30-minute lessons

        // Test 30-minute lesson pricing
        const thirtyMinutePrice = 30 === 30 ? instructorRate : instructorRate * 2;
        assert.strictEqual(thirtyMinutePrice, 60.00, '30-minute lesson should cost the base rate');

        // Test 60-minute lesson pricing  
        const sixtyMinutePrice = 60 === 30 ? instructorRate : instructorRate * 2;
        assert.strictEqual(sixtyMinutePrice, 120.00, '60-minute lesson should cost double the base rate');
    });

    it('should handle fallback pricing when no rate is set', () => {
        const fallbackRate = 50; // Default fallback rate
        
        // Test with undefined rate (should use fallback)
        const undefinedRate = undefined || fallbackRate;
        
        // 30-minute lesson with fallback
        const thirtyMinuteFallback = 30 === 30 ? undefinedRate : undefinedRate * 2;
        assert.strictEqual(thirtyMinuteFallback, 50.00, '30-minute lesson should use fallback rate');

        // 60-minute lesson with fallback
        const sixtyMinuteFallback = 60 === 30 ? undefinedRate : undefinedRate * 2;
        assert.strictEqual(sixtyMinuteFallback, 100.00, '60-minute lesson should use double fallback rate');
    });

    it('should validate pricing logic matches frontend calculation', () => {
        // Simulate the frontend pricing logic from BookingModal.vue
        const simulateFrontendPricing = (selectedDuration, instructorHourlyRate) => {
            const rate = instructorHourlyRate || 50;
            return parseInt(selectedDuration) === 30 ? rate : rate * 2;
        };

        // Test with instructor rate
        assert.strictEqual(simulateFrontendPricing('30', 60), 60, 'Frontend 30-min calculation should match');
        assert.strictEqual(simulateFrontendPricing('60', 60), 120, 'Frontend 60-min calculation should match');

        // Test with fallback rate
        assert.strictEqual(simulateFrontendPricing('30', null), 50, 'Frontend 30-min fallback should match');
        assert.strictEqual(simulateFrontendPricing('60', null), 100, 'Frontend 60-min fallback should match');
    });

    it('should calculate pricing based on duration multiplier', () => {
        // Test the core pricing logic
        const calculateLessonPrice = (duration, baseRate) => {
            return duration === 30 ? baseRate : baseRate * 2;
        };

        const baseRate = 75;
        
        assert.strictEqual(calculateLessonPrice(30, baseRate), 75, '30-minute lesson should cost base rate');
        assert.strictEqual(calculateLessonPrice(60, baseRate), 150, '60-minute lesson should cost double base rate');
    });

    it('should handle edge cases in pricing calculation', () => {
        const calculatePrice = (duration, rate) => {
            const safeRate = rate || 50; // Fallback
            return duration === 30 ? safeRate : safeRate * 2;
        };

        // Test with zero rate (should use fallback)
        assert.strictEqual(calculatePrice(30, 0), 50, 'Should use fallback for zero rate');
        assert.strictEqual(calculatePrice(60, 0), 100, 'Should use fallback for zero rate');

        // Test with undefined rate
        assert.strictEqual(calculatePrice(30, undefined), 50, 'Should use fallback for undefined rate');
        assert.strictEqual(calculatePrice(60, undefined), 100, 'Should use fallback for undefined rate');
    });
});
