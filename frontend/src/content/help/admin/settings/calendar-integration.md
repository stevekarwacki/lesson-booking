---
id: settings-calendar-integration
title: Set up Google Calendar integration
audience: admin
category: settings
order: 11
uiRoute: /admin/settings
uiTab: calendar
relatedComponents: [CalendarSettingsSection.vue, CalendarMethodSettings.vue]
sources: [docs/GOOGLE_CALENDAR_INTEGRATION.md]
keywords: [Google Calendar, calendar, sync, block, availability, integration, method]
---

# Set Up Google Calendar Integration

When connected, the app reads events from each instructor's Google Calendar and automatically blocks those times from being booked by students.

## Where to find it

> Settings → Calendar Settings

## Choose a connection method

| Method | How it works |
|---|---|
| **Service Account** (recommended) | A shared Google service account reads all instructor calendars. Instructors share their calendar with one email address. |
| **OAuth** | Each instructor individually connects their own Google account. |
| **Disabled** | No calendar integration — instructor availability is managed manually only. |

Select your preferred method — it saves immediately.

## Next steps by method

- **Service Account:** see [Configure a Google service account](calendar-service-account.md), then have each instructor share their calendar from their Availability tab.
- **OAuth:** make sure [Gmail OAuth credentials](gmail-oauth.md) are configured in Email Settings. Instructors then connect from their Availability tab.
- **Disabled:** no further setup needed.

## Monitor connected instructors

When Service Account is active, the bottom of the Calendar Settings page lists all instructors with their sync status: **Working**, **Failed**, or **Not Tested**. Use this to spot instructors who haven't completed their setup.

## Notes

- Only one method is active at a time. Switching methods will disconnect instructors on the previous method.
- Google Calendar events block time slots but do not create bookings in the app.
