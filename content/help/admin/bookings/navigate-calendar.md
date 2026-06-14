---
id: bookings-navigate-calendar
title: Navigate the calendar
audience: admin
category: bookings
order: 1
uiRoute: /calendar
relatedComponents: [InstructorCalendar.vue, WeeklyScheduleView.vue, DailyScheduleColumn.vue]
keywords: [navigate, week, previous, next, today, date picker, past, future, slot colours, color, grey]
---

# Navigate the Calendar

The calendar always opens on the current 7-day window starting from today. This means you see today in the first column and the next six days to the right.

## Where to find it

> Calendar (top navigation)

## Browse by week

Use the **Previous Week** and **Next Week** buttons at the top of the calendar to move the 7-day window backwards or forwards.

- You can browse up to **8 weeks into the past**.
- There is no limit on how far into the future you can browse.
- The header shows the date range of the current window, e.g. `6/13/2026 – 6/19/2026`.

When you are on any week other than the current one, a **Today** button appears between the navigation buttons. Click it to return to the window anchored on today.

## Jump to a specific date

Use the **date picker** (to the right of the navigation buttons) to select any specific date. The calendar switches to a single-day view for that date. Click **Back to Weekly View** to return to the 7-day grid.

On mobile, the single-day view is always shown. Use the date picker to change the day.

## Reading the colour-coded slots

| Colour | Meaning |
|--------|---------|
| Green | Available — the instructor is free and the slot can be booked |
| Blue | Booked — a student has a lesson here. Click to view or reschedule |
| Red (plain) | Unavailable — outside the instructor's set availability |
| Red (striped) | Blocked by Google Calendar — the instructor has an external event |
| Grey | Past — the time has already passed; cannot be booked |

## Notes

- Past slots are greyed out and cannot be clicked, even when browsing a previous week. You can still see who had lessons by looking at the blue booked slots.
- Recurring subscription lessons appear the same as regular booked lessons. They cannot be rescheduled from the calendar — manage them from the student's profile.
- The calendar only shows one instructor at a time. Use the instructor search at the top of the page to switch between instructors.
