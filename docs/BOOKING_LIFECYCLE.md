# Booking Lifecycle

This document covers the full lifecycle of a lesson booking: creation, rescheduling, cancellation, recurring bookings, and how all booking types are merged into the calendar display. For slot numbering see [SLOT_SYSTEM.md](SLOT_SYSTEM.md).

---

## Data model: `calendar_events`

Model: `models/Calendar.js` | Table: `calendar_events`

| Column | Type | Notes |
|--------|------|-------|
| `id` | PK | |
| `instructor_id` | FK → `instructors` | |
| `student_id` | FK → `users`, nullable | Null for admin-blocked/Google events |
| `date` | DATEONLY `YYYY-MM-DD` | UTC date of the lesson |
| `start_slot` | 0–95 | UTC slot (see SLOT_SYSTEM.md) |
| `duration` | ≥1 | Lesson length in 15-min slots (2=30min, 4=60min) |
| `status` | ENUM | `booked`, `blocked`, `cancelled` |

**Associations:** `belongsTo Instructor`, `belongsTo User as student`, `hasOne Attendance`, `hasMany Refund`.

---

## Routes overview (`routes/calendar.js` → `/api/calendar`)

All routes require JWT (`authMiddleware`). CASL middleware noted per endpoint.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/addEvent` | `authorize('create', 'Booking')` | Create a one-time booking |
| `PATCH` | `/student/:bookingId` | `authorizeBooking('update', …)` | Reschedule a booking |
| `DELETE` | `/student/:bookingId` | `authorizeBooking('cancel', …)` | Cancel + optional refund |
| `GET` | `/events/:id/:start/:end` | JWT | Weekly event feed (merged) |
| `GET` | `/dailyEvents/:id/:date` | JWT | Daily event feed (merged) |
| `GET` | `/student/:studentId` | `authorizeUserAccess` | Student's booking list |
| `GET` | `/instructor/:instructorId` | `authorize('read', 'Instructor')` | Instructor's booking list |
| `PATCH` | `/:eventId` | `authorizeBooking('update', …)` | Admin field update |
| `DELETE` | `/:eventId` | `authorizeBooking('cancel', …)` | Admin hard delete |
| `POST` | `/attendance` | `authorizeBooking('update', …)` | Record attendance status |
| `PUT` | `/bookings/:id/payment-status` | `authorizeBooking('update', …)` | Update in-person payment |
| `GET` | `/recurring/:id/:start/:end` | JWT | Virtual recurring-only feed |

---

## Creating a booking

### API: `POST /api/calendar/addEvent`

**Request body:**

```json
{
  "instructorId": 3,
  "startTime": "2026-06-16T14:00:00.000Z",
  "endTime":   "2026-06-16T14:30:00.000Z",
  "paymentMethod": "credits",
  "studentId": 12,
  "studentTimezone": "America/Los_Angeles"
}
```

`startTime` / `endTime` are UTC ISO strings. `studentId` is optional for students booking themselves; required when an instructor/admin books on behalf of a student. `paymentMethod`: `credits` | `card` | `in_person`.

**Response (201):**

```json
{
  "message": "Booking created successfully",
  "bookingId": 47,
  "booking": { "id": 47, "date": "2026-06-16", "start_slot": 56, "duration": 2, ... }
}
```

### Validation sequence (backend, `routes/calendar.js` lines 146–341)

1. **Parse time → slot**: UTC `startTime`/`endTime` → `formattedDate`, `dayOfWeek`, `startSlot`, `duration` via `timeUtils.timeToSlotUTC`.
2. **Availability check** (`timeUtils.isBookingAvailable`): timezone-aware. Student's requested UTC slot is compared against the instructor's local-timezone availability windows.
3. **One-time conflict check**: interval overlap on the same `date` and `instructor_id`. Overlap condition: `existingStart < newEnd AND newStart < existingEnd`.
4. **Recurring conflict check**: same overlap logic on `day_of_week`. Exception: a student booking a slot they already hold via a recurring subscription is allowed.
5. **`Calendar.addEvent`**: credit deduction or in-person transaction creation, then `INSERT` into `calendar_events`, then email confirmation queued.

### Frontend (`Booking.vue`)

`Booking.vue` collects the slot selection from `DailyScheduleColumn` (via `InstructorCalendar > handleSlotSelected`). It:
- Converts `{ startSlot, date }` to UTC ISO strings via `createUTCDateFromSlot` (`timeFormatting.js`).
- Offers duration choice (30/60 min) subject to availability and credit balance.
- For admins/instructors: shows a student search (`SearchBar`) for book-on-behalf mode.
- For credit payments: validates against `useCredits`.
- For card payments: renders `StripePaymentForm`.
- On confirm: `POST /api/calendar/addEvent`; on success, calls `scheduleStore.triggerInstructorRefresh`.

---

## Rescheduling a booking

### API: `PATCH /api/calendar/student/:bookingId`

**Request body:**

```json
{
  "startTime": "2026-06-18T16:00:00.000Z",
  "endTime":   "2026-06-18T16:30:00.000Z"
}
```

**Response:**

```json
{ "message": "Booking rescheduled successfully", "booking": { ... } }
```

Validation includes: availability check (direct slot containment — simpler than create, no full timezone-aware `isBookingAvailable`), one-time conflict check, recurring conflict check. The original booking's `duration` is preserved.

> **Known inconsistency:** the create path uses the timezone-aware `isBookingAvailable`; the reschedule path uses a raw slot comparison. This means reschedule availability validation does not account for instructor timezone offsets the same way. See [CALENDAR_SCHEDULING_SYSTEM.md — Known issues](CALENDAR_SCHEDULING_SYSTEM.md).

**24-hour policy:** CASL `canBookingAction(user, booking, 'update')` blocks students from rescheduling within 24 hours of the lesson start. Instructors and admins are exempt.

### Frontend (`EditBooking.vue`)

Two-slide flow:
1. **Slide 1**: a `DailyScheduleView` calendar for picking the new date/slot, plus a cancel button.
2. **Slide 2**: confirmation summary before posting.

`EditBooking` receives the `booking` prop with `{ id, date, start_slot, duration, instructor_id }` and converts the new selection back to UTC for the `PATCH` call.

---

## Cancelling a booking

### API: `DELETE /api/calendar/student/:bookingId`

No request body required. Cancels the booking (sets `status: 'cancelled'`) and optionally processes a refund.

**Response:**

```json
{
  "message": "Booking cancelled",
  "bookingId": 47,
  "cancelled": true,
  "refund": { "type": "credits", "amount": 1 }
}
```

The refund field is present only when a refund was issued. See [REFUND_SYSTEM.md](REFUND_SYSTEM.md) for the full refund logic.

**24-hour policy** applies to cancellation the same as rescheduling.

---

## Conflict detection

All conflict checks use the same interval-overlap formula:

```
conflict if: newStart < existingEnd AND newEnd > existingStart
```

Where `newEnd = newStart + duration` and `existingEnd = existingStart + existingDuration`.

- **One-time vs one-time**: SQL query on `date` + `instructor_id` + overlap.
- **One-time vs recurring**: same logic applied with `day_of_week` instead of `date`.
- **Recurring vs calendar**: `RecurringBooking.checkCalendarConflicts` runs a SQL `AND` across `day_of_week` and slot range.

A student's own recurring slot is an explicit exception — they are permitted to book a one-time lesson in a slot they hold via subscription.

---

## Merged event feed

`GET /api/calendar/events/:instructorId/:startDate/:endDate` returns one array combining:

1. **One-time bookings** from `calendar_events` (status `booked` or `blocked`).
2. **Virtual recurring events**: each active `RecurringBooking` is expanded into concrete date objects for every matching weekday in the requested range. These have `status: 'recurring_reserved'`.
3. **Google Calendar events** from `GoogleCalendarService.getEvents` (returns `[]` on failure).

The merge happens in `routes/calendar.js` (lines ~346–448). Each source is fetched independently; failures in Google Calendar do not block DB events from returning.

> **Performance note:** Despite accepting `startDate`/`endDate` URL parameters, `GET /api/calendar/events` calls `Calendar.getInstructorEvents(instructorId)` which fetches **all** non-cancelled bookings for the instructor with no date filter in SQL, then filters to the requested range in JavaScript. The same unscoped query is used for conflict detection during booking creation and reschedule. This works acceptably for small booking histories but will degrade as an instructor accumulates bookings over time. A future improvement would push the date range into the SQL `WHERE` clause.

The frontend maps `recurring_reserved` to `type: 'booked'` and `is_recurring: true` in `formatSlot`. These slots display identically to regular bookings but cannot be clicked for rescheduling.

---

## Recurring bookings

Recurring bookings represent a subscription-linked weekly lesson slot. They are not rows in `calendar_events` — they are a separate pattern that generates virtual events when the calendar feed is requested.

### Model: `recurring_bookings`

`models/RecurringBooking.js`

| Column | Notes |
|--------|-------|
| `id` | PK |
| `subscription_id` | Unique FK → `subscriptions` (one recurring slot per subscription) |
| `instructor_id` | FK → `instructors` |
| `day_of_week` | 0–6 |
| `start_slot` | 0–95 |
| `duration` | ≥1 (typically 2 or 4) |

**Associations:** `belongsTo Subscription`, `belongsTo Instructor`. Reverse: `Subscription.hasOne RecurringBooking`.

### Routes (`routes/recurringBookings.js` → `/api/recurring-bookings`)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/` | Create recurring slot (requires active subscription) |
| `GET` | `/user/:userId` | User's recurring bookings |
| `GET` | `/subscription/:subscriptionId` | One booking per subscription |
| `GET` | `/instructor/:instructorId/day/:dayOfWeek` | Instructor's recurring slots on a weekday |
| `PUT` | `/:id` | Update day/slot/instructor |
| `DELETE` | `/:id` | Remove recurring slot |

### Lifecycle

Recurring slots are created when a student purchases a subscription and selects their preferred weekly lesson time (`RecurringBookingModal.vue`). They are automatically deleted when the subscription is cancelled (`services/subscriptionCancellation.js`).

### Frontend: `RecurringBookingModal.vue`

Time-picker modal that lets the student choose `day_of_week` + `startSlot`. Validates against instructor availability and existing conflicts before creating the slot.

---

## Payment branching in booking creation

`Calendar.addEvent` (model, lines ~107–181) branches on `paymentMethod`:

| Method | Action |
|--------|--------|
| `credits` | Deducts credits (30-min: 1 × 30-min credit; 60-min: 1 × 60-min credit) via `Credits` model |
| `card` | Creates a `Transaction` record linked to a prior Stripe `PaymentIntent` |
| `in_person` | Creates a `Transaction` with `payment_method: 'in_person'` and `status: 'outstanding'` |

In-person payment eligibility is controlled by admin settings and per-student overrides. See [IN_PERSON_PAYMENT_FEATURE.md](IN_PERSON_PAYMENT_FEATURE.md).

---

## Attendance

After a lesson, instructors or admins can record attendance via `POST /api/calendar/attendance`:

```json
{ "eventId": 47, "status": "present", "notes": "" }
```

Valid statuses: `present`, `absent`, `tardy`. The lesson must have started before attendance can be recorded. Marking a student `absent` automatically triggers an absence notification email. See [ATTENDANCE_TRACKING_FEATURE.md](ATTENDANCE_TRACKING_FEATURE.md).

---

## Related documentation

| Topic | Document |
|-------|----------|
| Calendar system overview and data pipeline | [CALENDAR_SCHEDULING_SYSTEM.md](CALENDAR_SCHEDULING_SYSTEM.md) |
| Slot formulas and UTC vs local | [SLOT_SYSTEM.md](SLOT_SYSTEM.md) |
| Availability and blocking | [AVAILABILITY_AND_BLOCKING.md](AVAILABILITY_AND_BLOCKING.md) |
| Refund system | [REFUND_SYSTEM.md](REFUND_SYSTEM.md) |
| In-person payment configuration | [IN_PERSON_PAYMENT_FEATURE.md](IN_PERSON_PAYMENT_FEATURE.md) |
| 60-minute lesson durations and pricing | [60_MINUTE_LESSON_FEATURES.md](60_MINUTE_LESSON_FEATURES.md) |
| CASL permission rules (24-hour policy) | [CASL_PERMISSIONS_GUIDE.md](CASL_PERMISSIONS_GUIDE.md) |
| Attendance tracking | [ATTENDANCE_TRACKING_FEATURE.md](ATTENDANCE_TRACKING_FEATURE.md) |
