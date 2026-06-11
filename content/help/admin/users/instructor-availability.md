---
id: users-instructor-availability
title: Manage an instructor's availability and blocked time
audience: admin
category: users
order: 7
uiRoute: /admin/users
uiTab: availability
relatedComponents: [UserManager.vue, InstructorAvailabilityManager.vue, GoogleCalendarSettings.vue]
sources: [docs/BUSINESS_HOURS_AVAILABILITY_FEATURE.md, docs/GOOGLE_CALENDAR_INTEGRATION.md]
keywords: [availability, schedule, weekly, blocked time, instructor, calendar, vacation]
---

# Manage an Instructor's Availability and Blocked Time

Set when an instructor is available for lessons each week, and block out specific dates when they're unavailable.

## Where to find it

> Users → find instructor → Manage → Availability tab

## Set weekly availability

The weekly schedule is a grid of time slots. Click slots to toggle them available or unavailable for each day of the week.

1. Click the time slots on the grid that the instructor is available.
2. Click **Save Availability**.

> Slots outside your [business hours](../settings/business-hours.md) are grayed out and cannot be selected.

## Block out time

Use blocked time for vacations, one-off unavailability, or other reasons an instructor won't be available on specific dates.

1. Click **Add Blocked Time**.
2. Set the start and end date/time.
3. Optionally add a reason (e.g. "Vacation").
4. Click **Save**.

To remove a blocked period, click the delete icon next to it in the blocked time list.

## Google Calendar integration

If Google Calendar integration is enabled, the **Google Calendar** card appears at the bottom of the Availability tab. This is where the instructor connects their Google Calendar so events from it automatically block booking slots.

- **Service Account method:** shows the service account email the instructor needs to share their calendar with, and a field for their Calendar ID.
- **OAuth method:** shows a "Connect with Google" button for the instructor to authorize access.

See [Set up Google Calendar integration](../settings/calendar-integration.md) for admin-side configuration.
