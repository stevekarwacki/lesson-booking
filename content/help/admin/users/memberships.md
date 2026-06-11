---
id: users-memberships
title: Manage a student's subscription
audience: admin
category: users
order: 8
uiRoute: /admin/users
uiTab: memberships
relatedComponents: [UserManager.vue]
sources: []
keywords: [membership, subscription, cancel, reactivate, complimentary, recurring, plan]
---

# Manage a Student's Subscription

View and manage a student's recurring lesson membership — cancel it, reactivate it, or grant them a complimentary plan at no charge.

## Where to find it

> Users → find student → Manage → Memberships tab

## View current subscription

The Memberships tab shows the student's active or most recent subscription, including the plan name, billing status, and next renewal date.

## Cancel a subscription

1. Open the Memberships tab.
2. Click **Cancel Subscription**.
3. Confirm the cancellation.

The subscription remains active until the end of the current billing period, then stops.

## Reactivate a subscription

If a subscription was cancelled but hasn't expired yet:

1. Open the Memberships tab.
2. Click **Reactivate Subscription**.

The cancellation is reversed and billing continues as normal.

## Grant a complimentary subscription

Give a student a free membership without requiring payment.

1. Open the Memberships tab.
2. Click **Create Complimentary Subscription**.
3. Select the plan to grant.
4. Optionally add a note explaining why (for your records).
5. Click **Confirm**.

## Notes

- Complimentary subscriptions are tracked as Stripe trial subscriptions and will not charge the student.
- Cancelling a complimentary subscription works the same as a paid one.
- If a student already has an active subscription, you'll need to cancel it before creating a new one.
