import { describe, it, expect } from 'vitest'
import { transformWeeklySchedule } from '../utils/scheduleTransform'

// Helper: build a Date at midnight for a YYYY-MM-DD string in local time
function localDate(isoString) {
    const [year, month, day] = isoString.split('-').map(Number)
    return new Date(year, month - 1, day)
}

describe('transformWeeklySchedule', () => {
    it('should return 7 columns when given an empty schedule', () => {
        const weekStart = localDate('2026-06-14') // Sunday
        const columns = transformWeeklySchedule({}, weekStart)
        expect(columns).toHaveLength(7)
    })

    it('should use column date day-of-week for data lookup when week starts on Sunday', () => {
        // Sunday June 14 2026 — column 0 = Sun (dayOfWeek 0), column 1 = Mon (dayOfWeek 1), etc.
        const weekStart = localDate('2026-06-14') // Sunday
        const schedule = {
            24: { 0: { type: 'available', start_slot: 24, duration: 2 } }, // Sunday slot
            28: { 3: { type: 'booked',     start_slot: 28, duration: 2 } }, // Wednesday slot
        }
        const columns = transformWeeklySchedule(schedule, weekStart, 24, 30)

        // Column 0 should be Sunday (dayOfWeek 0) with data in slot 24
        expect(columns[0].dayName).toBe('Sun')
        expect(columns[0].dayIndex).toBe(0)
        expect(columns[0].slots.some(b => b.type === 'available')).toBe(true)

        // Column 3 should be Wednesday (dayOfWeek 3) with data in slot 28
        expect(columns[3].dayName).toBe('Wed')
        expect(columns[3].dayIndex).toBe(3)
        expect(columns[3].slots.some(b => b.type === 'booked')).toBe(true)
    })

    it('should correctly map data to columns when week starts on a non-Sunday day', () => {
        // Saturday June 13 2026 — column 0 = Sat (dayOfWeek 6), column 1 = Sun (dayOfWeek 0), etc.
        const weekStart = localDate('2026-06-13') // Saturday
        const schedule = {
            24: { 6: { type: 'available', start_slot: 24, duration: 2 } }, // Saturday data
            32: { 0: { type: 'booked',     start_slot: 32, duration: 2 } }, // Sunday data
        }
        const columns = transformWeeklySchedule(schedule, weekStart, 24, 34)

        // Column 0 should be Saturday (dayOfWeek 6)
        expect(columns[0].dayName).toBe('Sat')
        expect(columns[0].dayIndex).toBe(6)
        expect(columns[0].slots.some(b => b.type === 'available')).toBe(true)

        // Column 1 should be Sunday (dayOfWeek 0)
        expect(columns[1].dayName).toBe('Sun')
        expect(columns[1].dayIndex).toBe(0)
        expect(columns[1].slots.some(b => b.type === 'booked')).toBe(true)

        // No column should be labelled 'Sat' again
        expect(columns.filter(c => c.dayName === 'Sat')).toHaveLength(1)
    })

    it('should correctly map data when week starts on Monday (common European setting)', () => {
        // Monday June 15 2026 — column 0 = Mon (dayOfWeek 1)
        const weekStart = localDate('2026-06-15') // Monday
        const schedule = {
            24: { 1: { type: 'available', start_slot: 24, duration: 2 } }, // Monday data
            28: { 5: { type: 'booked',     start_slot: 28, duration: 2 } }, // Friday data
        }
        const columns = transformWeeklySchedule(schedule, weekStart, 24, 30)

        // Column 0 = Mon
        expect(columns[0].dayName).toBe('Mon')
        expect(columns[0].dayIndex).toBe(1)
        expect(columns[0].slots.some(b => b.type === 'available')).toBe(true)

        // Column 4 = Fri
        expect(columns[4].dayName).toBe('Fri')
        expect(columns[4].dayIndex).toBe(5)
        expect(columns[4].slots.some(b => b.type === 'booked')).toBe(true)
    })

    it('should cover exactly 7 consecutive days regardless of start day', () => {
        const weekStart = localDate('2026-06-13') // Saturday
        const columns = transformWeeklySchedule({}, weekStart)
        expect(columns).toHaveLength(7)

        // Each column's date should be exactly one day after the previous
        for (let i = 1; i < columns.length; i++) {
            const diff = columns[i].date.getTime() - columns[i - 1].date.getTime()
            expect(diff).toBe(24 * 60 * 60 * 1000)
        }

        // dayIndex values should be all 7 unique weekdays
        const dayIndices = columns.map(c => c.dayIndex)
        expect(new Set(dayIndices).size).toBe(7)
    })
})
