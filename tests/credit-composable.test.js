const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

describe('Credit Composable Logic', () => {
    describe('getAvailableCredits computed property', () => {
        it('should return correct credits for valid durations', () => {
            const creditBreakdown = {
                30: { credits: 5, next_expiry: null },
                60: { credits: 3, next_expiry: null }
            };
            
            const getAvailableCredits = (duration) => {
                const durationInt = parseInt(duration);
                return creditBreakdown[durationInt]?.credits || 0;
            };
            
            assert.strictEqual(getAvailableCredits('30'), 5);
            assert.strictEqual(getAvailableCredits('60'), 3);
            assert.strictEqual(getAvailableCredits(30), 5);
            assert.strictEqual(getAvailableCredits(60), 3);
        });

        it('should return 0 for invalid or missing durations', () => {
            const creditBreakdown = {
                30: { credits: 5, next_expiry: null },
                60: { credits: 3, next_expiry: null }
            };
            
            const getAvailableCredits = (duration) => {
                const durationInt = parseInt(duration);
                return creditBreakdown[durationInt]?.credits || 0;
            };
            
            assert.strictEqual(getAvailableCredits('45'), 0);
            assert.strictEqual(getAvailableCredits('90'), 0);
            assert.strictEqual(getAvailableCredits('invalid'), 0);
            assert.strictEqual(getAvailableCredits(null), 0);
            assert.strictEqual(getAvailableCredits(undefined), 0);
        });

        it('should handle empty credit breakdown', () => {
            const creditBreakdown = {
                30: { credits: 0, next_expiry: null },
                60: { credits: 0, next_expiry: null }
            };
            
            const getAvailableCredits = (duration) => {
                const durationInt = parseInt(duration);
                return creditBreakdown[durationInt]?.credits || 0;
            };
            
            assert.strictEqual(getAvailableCredits('30'), 0);
            assert.strictEqual(getAvailableCredits('60'), 0);
        });
    });

    describe('updateCreditsOptimistically logic', () => {
        it('should correctly update credit breakdown and total', () => {
            let userCredits = 8;
            let creditBreakdown = {
                30: { credits: 5, next_expiry: null },
                60: { credits: 3, next_expiry: null }
            };
            
            const updateCreditsOptimistically = (duration, creditChange) => {
                const durationInt = parseInt(duration);
                if (creditBreakdown[durationInt]) {
                    creditBreakdown[durationInt].credits += creditChange;
                    userCredits += creditChange;
                }
            };
            
            // Add 2 credits to 30-minute lessons
            updateCreditsOptimistically('30', 2);
            assert.strictEqual(creditBreakdown[30].credits, 7);
            assert.strictEqual(userCredits, 10);
            
            // Deduct 1 credit from 60-minute lessons
            updateCreditsOptimistically('60', -1);
            assert.strictEqual(creditBreakdown[60].credits, 2);
            assert.strictEqual(userCredits, 9);
        });

        it('should handle invalid durations gracefully', () => {
            let userCredits = 8;
            let creditBreakdown = {
                30: { credits: 5, next_expiry: null },
                60: { credits: 3, next_expiry: null }
            };
            
            const updateCreditsOptimistically = (duration, creditChange) => {
                const durationInt = parseInt(duration);
                if (creditBreakdown[durationInt]) {
                    creditBreakdown[durationInt].credits += creditChange;
                    userCredits += creditChange;
                }
            };
            
            // Try to update invalid duration
            updateCreditsOptimistically('45', 5);
            assert.strictEqual(creditBreakdown[30].credits, 5); // Unchanged
            assert.strictEqual(creditBreakdown[60].credits, 3); // Unchanged
            assert.strictEqual(userCredits, 8); // Unchanged
        });
    });

    describe('Credit state management', () => {
        it('should initialize with correct default state', () => {
            const initialState = {
                userCredits: 0,
                creditBreakdown: {
                    30: { credits: 0, next_expiry: null },
                    60: { credits: 0, next_expiry: null }
                },
                loading: false,
                error: null,
                nextExpiry: null
            };
            
            assert.strictEqual(initialState.userCredits, 0);
            assert.strictEqual(initialState.creditBreakdown[30].credits, 0);
            assert.strictEqual(initialState.creditBreakdown[60].credits, 0);
            assert.strictEqual(initialState.loading, false);
            assert.strictEqual(initialState.error, null);
            assert.strictEqual(initialState.nextExpiry, null);
        });

        it('should update state correctly from API response', () => {
            const apiResponse = {
                total_credits: 12,
                next_expiry: '2024-12-31T23:59:59.000Z',
                breakdown: {
                    30: { credits: 7, next_expiry: '2024-12-31T23:59:59.000Z' },
                    60: { credits: 5, next_expiry: '2024-11-30T23:59:59.000Z' }
                }
            };
            
            // Simulate state update logic
            const state = {
                userCredits: apiResponse.total_credits || 0,
                nextExpiry: apiResponse.next_expiry || null,
                creditBreakdown: apiResponse.breakdown || {
                    30: { credits: 0, next_expiry: null },
                    60: { credits: 0, next_expiry: null }
                }
            };
            
            assert.strictEqual(state.userCredits, 12);
            assert.strictEqual(state.nextExpiry, '2024-12-31T23:59:59.000Z');
            assert.strictEqual(state.creditBreakdown[30].credits, 7);
            assert.strictEqual(state.creditBreakdown[60].credits, 5);
            assert.strictEqual(state.creditBreakdown[30].next_expiry, '2024-12-31T23:59:59.000Z');
            assert.strictEqual(state.creditBreakdown[60].next_expiry, '2024-11-30T23:59:59.000Z');
        });

        it('should handle missing or malformed API response', () => {
            const malformedResponse = {
                // Missing total_credits and breakdown
                next_expiry: null
            };
            
            // Simulate state update with fallbacks
            const state = {
                userCredits: malformedResponse.total_credits || 0,
                nextExpiry: malformedResponse.next_expiry || null,
                creditBreakdown: malformedResponse.breakdown || {
                    30: { credits: 0, next_expiry: null },
                    60: { credits: 0, next_expiry: null }
                }
            };
            
            assert.strictEqual(state.userCredits, 0);
            assert.strictEqual(state.nextExpiry, null);
            assert.strictEqual(state.creditBreakdown[30].credits, 0);
            assert.strictEqual(state.creditBreakdown[60].credits, 0);
        });
    });

    describe('Credit calculation scenarios', () => {
        it('should handle typical booking scenarios', () => {
            const scenarios = [
                {
                    name: 'Student with mixed credits books 30-min lesson',
                    creditBreakdown: { 30: { credits: 3 }, 60: { credits: 2 } },
                    selectedDuration: '30',
                    expectedAvailable: 3,
                    canBook: true
                },
                {
                    name: 'Student with mixed credits books 60-min lesson',
                    creditBreakdown: { 30: { credits: 3 }, 60: { credits: 2 } },
                    selectedDuration: '60',
                    expectedAvailable: 2,
                    canBook: true
                },
                {
                    name: 'Student with only 30-min credits tries 60-min lesson',
                    creditBreakdown: { 30: { credits: 5 }, 60: { credits: 0 } },
                    selectedDuration: '60',
                    expectedAvailable: 0,
                    canBook: false
                },
                {
                    name: 'Student with no credits',
                    creditBreakdown: { 30: { credits: 0 }, 60: { credits: 0 } },
                    selectedDuration: '30',
                    expectedAvailable: 0,
                    canBook: false
                }
            ];
            
            scenarios.forEach(scenario => {
                const getAvailableCredits = (duration) => {
                    const durationInt = parseInt(duration);
                    return scenario.creditBreakdown[durationInt]?.credits || 0;
                };
                
                const available = getAvailableCredits(scenario.selectedDuration);
                const canBook = available > 0;
                
                assert.strictEqual(available, scenario.expectedAvailable, 
                    `${scenario.name}: Expected ${scenario.expectedAvailable} credits, got ${available}`);
                assert.strictEqual(canBook, scenario.canBook, 
                    `${scenario.name}: Expected canBook=${scenario.canBook}, got ${canBook}`);
            });
        });
    });
});
