---
id: bookings-book-on-behalf
title: Book a lesson on behalf of a student
audience: admin
category: bookings
order: 1
uiRoute: /calendar
relatedComponents: [InstructorCalendar.vue]
sources: [docs/BOOK_ON_BEHALF_FEATURE.md]
keywords: [book, lesson, on behalf, student, admin, calendar, slot]
---

# Book a Lesson on Behalf of a Student

Book a lesson for a student directly from the Calendar, without the student needing to do it themselves.

## Where to find it

> Calendar → click an available time slot

## Steps

1. Go to **Calendar** and navigate to the instructor and week you want.
2. Click an available (unbooked) time slot.
3. The booking modal opens in "Book for Student" mode.
4. Search for the student by name or email and click to select them.
5. Choose a payment method:
   - **In-person** — student pays at the lesson (default)
   - **Use Credits** — appears automatically if the student has credits for that lesson duration
   - **Card** — only available if enabled in [Lesson Settings](../settings/lessons-and-payments.md)
6. Click **Confirm Booking**.

## Notes

- The **Confirm** button stays disabled until a student is selected.
- Credit balances shown are specific to the lesson duration — a student's 30-minute credits won't appear for a 60-minute slot.
- If a student has no credits and card payment is not enabled, only in-person payment is available.
- The booking appears in the calendar immediately and shows in the student's booking history.

See also: [Reschedule a lesson](reschedule-booking.md) | [Cancel a lesson](cancel-booking.md)
