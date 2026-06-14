# Availability and Blocking

This document covers how instructor availability is stored, edited, and applied, as well as how time slots are blocked by manual ranges and Google Calendar events.

For slot numbering conventions (start_slot, duration, day_of_week) see [SLOT_SYSTEM.md](SLOT_SYSTEM.md).

---

## Weekly availability model

### Database: `instructor_weekly_availability`

Model: `models/InstructorAvailability.js`

Each row represents one **recurring weekly window** — a continuous block of time on a given weekday when the instructor is available for bookings. This is a pattern, not a concrete date.

| Column | Type | Notes |
|--------|------|-------|
| `id` | PK | |
| `instructor_id` | FK → `instructors` | |
| `day_of_week` | 0–6 | 0 = Sunday, 6 = Saturday |
| `start_slot` | 0–95 | In instructor's local timezone |
| `duration` | ≥1 | In 15-min slots |
| `instructor_timezone` | IANA string | Default `UTC`; required for correct slot interpretation |
| `local_start_time` | `HH:MM` | Derived from slot; stored for display |
| `local_end_time` | `HH:MM` | Derived from slot + duration; stored for display |

An instructor with availability on Monday 9–5 would have one row: `day_of_week: 1`, `start_slot: 36` (09:00 local), `duration: 32` (8 hours = 32 slots). Multiple non-contiguous windows per day are supported as separate rows.

### API routes (`routes/instructorAvailability.js` → `/api/availability`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/:instructorId/weekly` | JWT | Returns all availability rows for the instructor |
| `POST` | `/:instructorId/weekly` | `authorize('update', 'InstructorAvailability')` | **Replaces** the entire weekly schedule (transactional) |
| `GET` | `/:instructorId/daily/:date` | JWT | Returns only rows matching `date`'s day-of-week |

#### `GET /:instructorId/weekly` response

```json
[
  {
    "id": 1,
    "instructor_id": 3,
    "day_of_week": 1,
    "start_slot": 36,
    "duration": 16,
    "instructor_timezone": "America/Los_Angeles",
    "local_start_time": "09:00",
    "local_end_time": "13:00"
  }
]
```

Rows are filtered against the current business hours (from `AppSettings.getBusinessHours()`). Legacy rows outside business hours are excluded — they are not deleted.

#### `POST /:instructorId/weekly` request

```json
{
  "slots": [
    { "dayOfWeek": 1, "startTime": "09:00", "endTime": "13:00" },
    { "dayOfWeek": 3, "startTime": "14:00", "endTime": "18:00" }
  ],
  "instructorTimezone": "America/Los_Angeles"
}
```

The backend validates each slot against business hours before saving. The previous schedule is deleted and the new one is inserted within a single transaction.

---

## Availability editing UI

### `InstructorAvailabilityManager.vue`
`frontend/src/components/InstructorAvailabilityManager.vue`

Thin wrapper that loads the instructor's availability via `useAvailability` and passes it to `InstructorAvailabilityView`. Handles save via `saveWeeklyAvailability` mutation (which invalidates the weekly availability cache so `InstructorCalendar` re-fetches on next render).

### `InstructorAvailabilityView.vue`
`frontend/src/components/InstructorAvailabilityView.vue`

Interactive weekly grid UI. Each cell is a 30-minute slot. Instructors can drag or click to toggle availability windows. The component emits `update:weeklySchedule` and `save` events.

Slot display uses `slotToTime` from `timeFormatting.js`. The timezone store (`frontend/src/stores/timezoneStore.js`) allows instructors to view their schedule in their preferred timezone, independent of browser locale.

### Composable: `useAvailability.js`
`frontend/src/composables/useAvailability.js`

```
weeklyAvailability  — GET /api/availability/:id/weekly
dailyAvailability   — GET /api/availability/:id/daily/:date
saveWeeklyAvailability — POST /api/availability/:id/weekly
```

Cache keys: `['availability', instructorId, 'weekly']` and `['availability', instructorId, 'daily', date]`. Saving weekly availability invalidates both.

---

## How availability reaches the booking grid

The backend returns contiguous availability windows, not individual bookable slots. The per-15-minute expansion happens entirely on the frontend inside `InstructorCalendar.vue > fetchWeeklySchedule`:

```js
// For each availability row
for (let i = 0; i < slotDuration; i++) {
    const currentSlot = slotStart + i
    formattedSchedule[currentSlot][dayIndex] = formatSlot(slot, slotDate)
}
```

This expansion populates `formattedSchedule[slot][dayOfWeek]` at every 15-minute position the window covers. Booked events (from `weeklyEvents`) then overwrite the affected positions. The result is passed to `scheduleTransform.js → consolidateScheduleToBlocks` which re-merges the per-slot data back into visual blocks.

---

## Blocked times (partially implemented)

Manual date/time blocking (e.g., an instructor blocking a vacation week) is partially built.

### What exists

- API routes at `POST /api/availability/:id/blocked` and `DELETE /api/availability/blocked/:id`.
- `InstructorTimeBlocking.vue` UI component (`frontend/src/components/InstructorTimeBlocking.vue`).
- `createBlockedSlot` / `deleteBlockedSlot` mutations in `useAvailability.js`.

### What is incomplete

- The database table for blocked times does not exist — no migration has been written.
- `InstructorAvailability.getBlockedTimes` and `getBlockedTime` model methods referenced by the routes call a non-existent table (`Instructor_blocked_times`).
- The frontend `blockedSlots` query in `useAvailability` is disabled (`enabled: false`).

### Status

**Do not rely on blocked-time routes in production.** The feature is partially scaffolded and will require a new migration, model implementation, and frontend enablement before it is usable.

---

## Google Calendar blocking

Google Calendar events block availability automatically when an instructor connects their calendar. The data flow:

```
Admin settings → calendar method (OAuth or Service Account)
        │
        ▼
GET /api/calendar/events/:id/:start/:end
        │
        ▼
GoogleCalendarService.getEvents()
    ├── Authenticates via OAuth token (InstructorGoogleToken) or
    │   service account (config/calendarConfig.js)
    ├── Fetches events via Google Calendar API (calendar.events.list)
    ├── Converts events to slot objects (convertToSlots)
    └── Returns merged with DB bookings and recurring events
        │
        ▼
InstructorCalendar.fetchWeeklySchedule
    └── Events overwrite availability cells at matching slots
```

### Event conversion rules (`GoogleCalendarService.js`)

**Timed events:**
- Start time is rounded **up** to the nearest 30-minute boundary.
- Duration is rounded **up** to cover all touched 30-min blocks (minimum 2 slots = 30 min).
- Converted using business timezone, not instructor personal timezone.

**All-day events:**
- Behaviour controlled by `InstructorCalendarConfig.all_day_event_handling`:
  - `ignore` (default): the event is skipped.
  - `block`: the event is returned with `blocks_all_available_slots: true` and `duration: 0`.

**`blocks_all_available_slots` handling (frontend):**

```js
// In fetchWeeklySchedule
if (event.blocks_all_available_slots) {
    // Wipe the entire day column — replace all availability with the Google event
    Object.keys(formattedSchedule).forEach(slotKey => {
        if (formattedSchedule[slot][dayIndex]) {
            formattedSchedule[slot][dayIndex] = formatSlot(event, existingDate)
        }
    })
}
```

### Failure behaviour

If the Google Calendar API fails (expired OAuth token, network error, misconfiguration), `GoogleCalendarService.getEvents` returns an empty array and the API endpoint continues normally with DB events only. Availability is not affected. The error is logged server-side.

### Configuration

Google Calendar is configured per-instructor via `InstructorCalendarConfig` (model: `models/InstructorCalendarConfig.js`). The admin sets the global method (OAuth or service account) in Admin Settings → Calendar. Instructors connect their individual account in their Availability settings.

For full setup instructions, see [GOOGLE_CALENDAR_INTEGRATION.md](GOOGLE_CALENDAR_INTEGRATION.md).

---

## Related documentation

| Topic | Document |
|-------|----------|
| Slot formulas and UTC vs local | [SLOT_SYSTEM.md](SLOT_SYSTEM.md) |
| Calendar system overview | [CALENDAR_SCHEDULING_SYSTEM.md](CALENDAR_SCHEDULING_SYSTEM.md) |
| Booking create/reschedule/cancel | [BOOKING_LIFECYCLE.md](BOOKING_LIFECYCLE.md) |
| Business hours configuration | [BUSINESS_HOURS_AVAILABILITY_FEATURE.md](BUSINESS_HOURS_AVAILABILITY_FEATURE.md) |
| Google Calendar integration setup | [GOOGLE_CALENDAR_INTEGRATION.md](GOOGLE_CALENDAR_INTEGRATION.md) |
