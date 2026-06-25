---
id: bookings-cancel
title: Cancel a student's lesson
audience: admin
category: bookings
order: 2
uiRoute: /bookings
relatedComponents: [EditBooking.vue, BookingList.vue, UserManager.vue]
sources: []
keywords: [cancel, booking, lesson, remove, delete]
---

# Cancel a Student's Lesson

Cancel a booked lesson on behalf of a student.

## Where to find it

> Bookings → find the lesson → Reschedule → Cancel Booking

Or from the student's profile:

> Users → find student → Manage → Bookings tab → Reschedule → Cancel Booking

## Steps

1. Find the lesson on the **Bookings** page (or in the student's **Bookings** tab in Users).
2. Click **Reschedule** to open the booking detail view.
3. Click **Cancel Booking**.
4. Confirm the cancellation.

## Notes

- Cancelling a lesson does not automatically issue a refund. If the student paid with Stripe or credits, [process a refund](process-refund.md) separately after cancelling.
- Admins are not subject to the 24-hour cancellation window that applies to students.
- Once cancelled, the time slot becomes available again for new bookings.

See also: [Process a refund](process-refund.md)
