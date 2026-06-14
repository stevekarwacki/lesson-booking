# Slot System

This document is the canonical reference for how time is represented in the lesson booking system. All scheduling code — frontend and backend — is built on this model. When in doubt, return here.

---

## Core model

Time within a day is divided into **96 slots of 15 minutes each**.

| Concept | Value |
|---------|-------|
| Slot granularity | 15 minutes |
| Slots per day | 96 (0–95) |
| Slot 0 | **00:00 (midnight)** |
| Slot 24 | 06:00 AM |
| Slot 36 | 09:00 AM |
| Slot 80 | 20:00 (8 PM) |
| Slot 95 | 23:45 |
| `MAX_SLOT_INDEX` | 95 |

> **Important — common misconception:** Several legacy comments in the codebase (notably `utils/abilities.js` line 229 and the old `CLAUDE.md` Booking Time Slots section) state "slot 0 = 6:00 AM". **This is wrong.** Slot 0 is always midnight. The 6 AM association comes from the default business-hours display grid (see below).

---

## Key fields

| Field | Where used | Meaning |
|-------|-----------|---------|
| `start_slot` | `Calendar`, `InstructorAvailability`, `RecurringBooking` | Integer 0–95: when the event/window starts |
| `duration` | Same models | Integer ≥1: length in 15-min slots (2 = 30 min, 4 = 60 min) |
| `day_of_week` | `InstructorAvailability`, `RecurringBooking` | Integer 0–6: 0 = Sunday, 6 = Saturday |
| `date` | `Calendar` (`calendar_events`) | `DATEONLY` `YYYY-MM-DD`: the specific calendar day for one-time bookings |

---

## Canonical formulas

### Clock time → slot

```js
// Formula
slot = Math.floor(hours * 4 + minutes / 15)

// Examples
slotFor(6, 0)  = 24   // 06:00 AM
slotFor(9, 30) = 38   // 09:30 AM
slotFor(17, 0) = 68   // 05:00 PM
```

**Backend:** `utils/timeUtils.js` → `timeToSlotUTC(date)` (line 9), `localTimeToUTCSlot` (line 127), `timeToLocalSlot` (line 230)

**Frontend:** `frontend/src/utils/timeFormatting.js` → `timeToSlot(timeString)` (line 257)

### Slot → clock time

```js
// Formula
hours   = Math.floor(slot / 4)
minutes = (slot % 4) * 15

// Examples
slotToTime(24)  = "06:00"
slotToTime(36)  = "09:00"
slotToTime(38)  = "09:30"
slotToTime(68)  = "17:00"
```

**Backend:** `utils/timeUtils.js` → `slotToTimeUTC(slot)` (line 27), `localSlotToTime(slot)` (line 240)

**Frontend:** `frontend/src/utils/timeFormatting.js` → `slotToTime(slot)` (line 266)

### Duration

```js
duration_in_slots = Math.ceil(minutes / 15)

// Common values
30 min → 2 slots
60 min → 4 slots
```

---

## UTC vs. local time — which to use where

This is the most common source of bugs in the scheduling system. The rule is:

| Context | Time reference | Why |
|---------|---------------|-----|
| **Storing a one-time booking** (`calendar_events`) | UTC | The DB `DATEONLY` date and `start_slot` together represent an absolute moment. Conflict detection compares UTC slots. |
| **Storing weekly availability** (`instructor_weekly_availability`) | Instructor local time | Availability patterns are "9 AM every Monday in my timezone," not a UTC time. |
| **Displaying slots in the UI** | Local (business or user timezone) | Users always see times in their context. |

### Booking create (UTC path)

`POST /api/calendar/addEvent` receives `startTime` and `endTime` as UTC ISO strings. The backend parses them with `timeToSlotUTC` from `utils/timeUtils.js` to derive `start_slot`, `duration`, and `date`. Availability validation converts the student's local booking time to UTC before comparison (`isBookingAvailable`, `timeUtils.js` line 287).

On the frontend, `Booking.vue` converts the selected `startSlot` + `date` to UTC ISO strings via `createUTCDateFromSlot` (`timeFormatting.js`) before posting.

### Availability storage (local path)

`POST /api/availability/:id/weekly` receives `{ dayOfWeek, startTime, endTime }` as local `HH:MM` strings plus `instructorTimezone`. The backend converts these to `start_slot`/`duration` using `createLocalAvailabilityRecord` (`timeUtils.js` line 259), which applies `timeToLocalSlot`. The timezone is stored on the row so future reads can convert back.

### Google Calendar (business timezone path)

Google events are returned in UTC. `GoogleCalendarService.js` converts them to slot positions using the business timezone (`utils/businessTimezone.js`), not the instructor's personal timezone. Start times are rounded **up** to the nearest 30-minute boundary; durations are rounded up to cover all touched 30-min blocks.

---

## The "6 AM display grid" — not a slot offset

The frontend displays the schedule grid from 6 AM (slot 24) to 8 PM (slot 80) by default. This is a **display constraint**, not a data constraint. It comes from:

```js
// frontend/src/composables/useAppSettings.js
const earliestOpenTime = computed(() => settings.value?.earliestOpenHour ?? 6)
const latestCloseTime  = computed(() => settings.value?.latestCloseHour  ?? 20)

// frontend/src/components/WeeklyScheduleView.vue
const startSlot = earliestOpenTime.value * 4  // 6 * 4 = 24
const endSlot   = latestCloseTime.value  * 4  // 20 * 4 = 80
```

Administrators can change business hours in the Settings page, which shifts both the visible grid and the range used for validation. Slot 0 always means midnight regardless of these settings.

---

## Common slot values (quick reference)

| Slot | Time |
|------|------|
| 0 | 00:00 (midnight) |
| 4 | 01:00 |
| 8 | 02:00 |
| 24 | 06:00 AM |
| 28 | 07:00 AM |
| 32 | 08:00 AM |
| 36 | 09:00 AM |
| 40 | 10:00 AM |
| 44 | 11:00 AM |
| 48 | 12:00 PM (noon) |
| 52 | 01:00 PM |
| 56 | 02:00 PM |
| 60 | 03:00 PM |
| 64 | 04:00 PM |
| 68 | 05:00 PM |
| 72 | 06:00 PM |
| 76 | 07:00 PM |
| 80 | 08:00 PM |
| 95 | 11:45 PM |

---

## Related documentation

| Topic | Document |
|-------|----------|
| Calendar system overview | [CALENDAR_SCHEDULING_SYSTEM.md](CALENDAR_SCHEDULING_SYSTEM.md) |
| Availability and blocked-times model | [AVAILABILITY_AND_BLOCKING.md](AVAILABILITY_AND_BLOCKING.md) |
| Booking create/reschedule/cancel | [BOOKING_LIFECYCLE.md](BOOKING_LIFECYCLE.md) |
| Business hours configuration | [BUSINESS_HOURS_AVAILABILITY_FEATURE.md](BUSINESS_HOURS_AVAILABILITY_FEATURE.md) |
| Date helper API | [DATE_HELPERS_SYSTEM.md](DATE_HELPERS_SYSTEM.md) |
