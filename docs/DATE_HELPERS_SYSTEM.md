# Date Helpers System

## Overview

The Date Helpers System provides a comprehensive, timezone-aware abstraction layer for all date operations in the lesson booking application. It replaces manual `new Date()` constructions and provides consistent date handling across both frontend and backend components.

## Architecture

### Core Philosophy
- **Timestamp-based**: All internal operations use Unix timestamps for consistency
- **Timezone-aware**: Proper timezone handling without storing user timezones
- **Functional API**: Immutable operations that return new helper instances
- **Cross-platform**: Identical API for both frontend (Vue.js) and backend (Node.js)

### File Locations
- **Backend**: `utils/dateHelpers.js`
- **Frontend**: `frontend/src/utils/dateHelpers.js`

## Core Functions

### Creation Functions

```javascript
// Create helper for current time
const now = createDateHelper()

// Create helper for today at midnight
const today = today()

// Create helper from date string (YYYY-MM-DD)
const date = fromString('2025-10-12')

// Create helper from timestamp
const date = fromTimestamp(1728691200000)
```

### Manipulation Methods

```javascript
const helper = today()

// Basic arithmetic
helper.addDays(7)          // Add 7 days
helper.addHours(2)         // Add 2 hours
helper.addMinutes(30)      // Add 30 minutes
helper.addWeeks(2)         // Add 2 weeks
helper.addMonths(1)        // Add 1 month

// Boundary operations
helper.startOfDay()        // Midnight of the same day
helper.endOfDay()          // 23:59:59 of the same day
```

### Comparison Methods

```javascript
const now = createDateHelper()
const future = now.addHours(2)

// Basic comparisons
now.isBefore(future)       // true
now.isAfter(future)        // false
now.isSameDay(future)      // true
now.isToday()              // true
now.isPast()               // false
now.isFuture()             // true

// Advanced comparisons
now.diffInHours(future)    // 2
now.isBetween(past, future) // true/false
```

### Business Logic Methods

```javascript
const booking = fromString('2025-10-13')

// Booking restrictions
booking.isWithinCancellationWindow(24) // Check if within 24 hours

// Subscription validation
const periodEnd = fromString('2025-12-31')
now.isSubscriptionActive(periodEnd)    // Check if subscription is active
```

### Output Methods

```javascript
const helper = today()

// Timestamps and dates
helper.toTimestamp()       // Unix timestamp
helper.toDate()           // JavaScript Date object
helper.toDateString()     // 'YYYY-MM-DD'
helper.toTimeString()     // 'HH:MM:SS'
helper.toDateTime()       // 'YYYY-MM-DD HH:MM:SS'

// Formatted output
helper.formatForEmail()   // Email-friendly format
```

## Integration Examples

### Booking Validation

```javascript
// Before (manual date handling)
const bookingDate = new Date(booking.date + 'T00:00:00Z')
bookingDate.setUTCHours(booking.start_slot * 0.25 + 6)
const now = new Date()
const hoursUntil = (bookingDate - now) / (1000 * 60 * 60)
const canModify = hoursUntil >= 24

// After (using date helpers)
const bookingHelper = fromString(booking.date)
const bookingDateTime = bookingHelper.addHours(booking.start_slot * 0.25 + 6)
const canModify = !bookingDateTime.isWithinCancellationWindow(24)
```

### Attendance Tracking

```javascript
// Before
const lessonDate = new Date(booking.date)
lessonDate.setHours(parseInt(startTime.split(':')[0]))
const now = new Date()
const canMarkAttendance = now >= lessonDate

// After
const nowHelper = createDateHelper()
const lessonHelper = fromString(booking.date)
const lessonDateTime = lessonHelper.addHours(hour24).addMinutes(minutes)
const canMarkAttendance = nowHelper.toTimestamp() >= lessonDateTime.toTimestamp()
```

### Email Date Formatting

```javascript
// Before
const lessonDate = new Date(booking.date + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
})

// After
const lessonDate = fromString(booking.date).formatForEmail()
```

## Filtering Utilities

### Built-in Filters

```javascript
import { filterToday, filterPast, filterFuture } from '../utils/dateHelpers.js'

// Filter arrays by date field
const todayBookings = filterToday(bookings, 'date')
const pastBookings = filterPast(bookings, 'date')  
const futureBookings = filterFuture(bookings, 'date')
```

### Custom Filtering

```javascript
const bookings = [
    { date: '2025-10-12', name: 'Lesson 1' },
    { date: '2025-10-13', name: 'Lesson 2' }
]

// Filter for specific conditions
const withinWeek = bookings.filter(booking => {
    const bookingHelper = fromString(booking.date)
    const weekFromNow = today().addDays(7)
    return bookingHelper.isBefore(weekFromNow)
})
```

## Testing Considerations

### Mock Time in Tests

```javascript
// Frontend (Vitest)
vi.useFakeTimers()
vi.setSystemTime(new Date('2025-10-12T11:00:00')) // Local time
const helper = createDateHelper() // Will use mocked time

// Backend (Node.js native test runner)
// Date helpers automatically use Date.now() which respects mocked time
```

### Timezone-Consistent Tests

```javascript
// Good: Use same timezone reference
const mockTime = new Date(todayStr + 'T11:00:00') // Local time
vi.setSystemTime(mockTime)

// Bad: Mix UTC and local time
const mockTime = new Date(todayStr + 'T11:00:00Z') // UTC time
```

## Migration Guide

### Step 1: Replace Date Constructors

```javascript
// Replace these patterns:
new Date()                    → createDateHelper()
new Date(dateString)          → fromString(dateString)
new Date(timestamp)           → fromTimestamp(timestamp)
Date.now()                    → createDateHelper().toTimestamp()
```

### Step 2: Replace Date Arithmetic

```javascript
// Replace manual arithmetic:
date.setDate(date.getDate() + 7)     → helper.addDays(7)
date.setHours(date.getHours() + 2)   → helper.addHours(2)
date.setMonth(date.getMonth() + 1)   → helper.addMonths(1)
```

### Step 3: Replace Comparisons

```javascript
// Replace manual comparisons:
date1 < date2                        → helper1.isBefore(helper2)
date1.toDateString() === date2.toDateString() → helper1.isSameDay(helper2)
(date2 - date1) / (1000 * 60 * 60)  → helper1.diffInHours(helper2)
```

## Performance Considerations

- **Lightweight**: Helpers are simple objects with methods, minimal overhead
- **Immutable**: Operations return new instances, preventing accidental mutations
- **Cacheable**: Timestamps can be cached and reused efficiently
- **Memory efficient**: No heavy dependencies, pure JavaScript implementation

## Error Handling

The date helpers include built-in validation:

```javascript
// Invalid inputs return current time
fromString(null)           // Returns createDateHelper()
fromString('invalid')      // Returns createDateHelper()
fromTimestamp(NaN)         // Returns createDateHelper()

// Validation method available
helper.isValid()           // true/false
```

## Best Practices

1. **Always use helpers for date operations** - Avoid `new Date()` in application code
2. **Use appropriate creation method** - `today()` for dates, `createDateHelper()` for timestamps
3. **Chain operations** - `today().addDays(7).addHours(2)`
4. **Use business logic methods** - `isWithinCancellationWindow()` instead of manual calculations
5. **Test with consistent timezones** - Use local time in tests, not UTC
6. **Validate inputs** - Check `isValid()` for user-provided dates

## Related Documentation

- [Attendance Tracking Feature](ATTENDANCE_TRACKING_FEATURE.md) - Uses date helpers for lesson timing
- [Testing Guide](TESTING_GUIDE.md) - Includes date helper testing patterns
- [Date Helpers Analysis](../plans/DATE_HELPERS_ANALYSIS.md) - Implementation planning document
