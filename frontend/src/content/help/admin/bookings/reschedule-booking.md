---
id: bookings-reschedule
title: Reschedule a student's lesson
audience: admin
category: bookings
order: 2
uiRoute: /calendar
relatedComponents: [InstructorCalendar.vue, EditBooking.vue]
sources: []
keywords: [reschedule, change, booking, lesson, date, time, move]
---

# Reschedule a Student's Lesson

Move an existing booking to a different date or time. You can do this from the Calendar or from the student's booking history.

## From the Calendar

1. Go to **Calendar** and find the booking.
2. Click on the booked slot.
3. The reschedule modal opens — pick a new date and an available time slot.
4. Click **Confirm Reschedule**.

## From a student's booking history

1. Go to **Users** → find the student → **Manage** → **Bookings** tab.
2. Find the booking and click **Reschedule**.
3. Pick a new date and time slot.
4. Click **Confirm Reschedule**.

## Notes

- Only available time slots (within the instructor's availability and not already booked) are shown.
- The lesson duration is preserved — a 60-minute booking reschedules as 60 minutes.
- Recurring subscription lessons cannot be rescheduled individually from here. Those are managed through the student's recurring booking settings.
- Admins are not subject to the 24-hour modification window that applies to students.

See also: [Cancel a lesson](cancel-booking.md)
