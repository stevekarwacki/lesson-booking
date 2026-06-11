---
id: bookings-cancel
title: Cancel a student's lesson
audience: admin
category: bookings
order: 3
uiRoute: /admin/users
uiTab: bookings
relatedComponents: [EditBooking.vue, UserManager.vue]
sources: []
keywords: [cancel, booking, lesson, remove, delete]
---

# Cancel a Student's Lesson

Cancel a booked lesson on behalf of a student.

## Where to find it

> Users → find student → Manage → Bookings tab → Reschedule → Cancel Booking

## Steps

1. Go to **Users**, find the student, and click **Manage**.
2. Open the **Bookings** tab.
3. Find the lesson and click **Reschedule** to open the booking detail view.
4. Click **Cancel Booking**.
5. Confirm the cancellation.

## Notes

- Cancelling a lesson does not automatically issue a refund. If the student paid with Stripe or credits, [process a refund](process-refund.md) separately after cancelling.
- Admins are not subject to the 24-hour cancellation window that applies to students.
- Once cancelled, the time slot becomes available again for new bookings.

See also: [Process a refund](process-refund.md)
