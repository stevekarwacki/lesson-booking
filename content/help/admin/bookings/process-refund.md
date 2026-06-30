---
id: bookings-refund
title: Process a refund for a lesson
audience: admin
category: bookings
order: 3
uiRoute: /bookings
relatedComponents: [RefundModal.vue, BookingList.vue, UserManager.vue]
sources: [docs/REFUND_SYSTEM.md]
keywords: [refund, credit, Stripe, payment, lesson, cancel, restore]
---

# Process a Refund for a Lesson

Return payment to a student after a lesson is cancelled or as a goodwill gesture. Refunds can go back to the original payment method (Stripe) or be returned as lesson credits.

## Where to find it

> Users → find student → Manage → Bookings tab → Refund button on a booking

## Steps

1. Open the student's **Bookings** tab.
2. Find the lesson and click **Refund**.
3. The refund modal shows the lesson details and available refund options:
   - **Original payment method** — returns funds to the Stripe payment that was charged
   - **Lesson credits** — adds a credit back to the student's account instead
4. Optionally enter a reason for the refund.
5. Check the confirmation checkbox.
6. Click **Process Refund**.

## Notes

- The **Refund** button only appears on lessons that haven't already been refunded.
- If a lesson was paid with credits, the refund returns a credit. If paid via Stripe, you can choose between a Stripe refund or a credit.
- Stripe refunds are processed in real time and typically appear on the student's statement within a few business days.
- Refunded credits have no expiration date.
- Admins can refund any booking. Instructors can only refund bookings for their own students.

See also: [Cancel a lesson](cancel-booking.md)
