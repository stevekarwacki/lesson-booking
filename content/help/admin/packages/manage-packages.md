---
id: packages-manage
title: Create, edit, and delete packages
audience: admin
category: packages
order: 1
uiRoute: /admin/packages
relatedComponents: [PackageManager.vue]
sources: []
keywords: [package, pricing, credits, membership, one-time, lesson, create, edit, delete]
---

# Create, Edit, and Delete Packages

Packages are what students purchase to book lessons. There are two types: one-time credit bundles and recurring memberships.

## Where to find it

> Packages

## Package types

| Type | How it works |
|---|---|
| **One-time** | Student pays once and receives a set number of lesson credits |
| **Membership** | Student is billed on a recurring cycle and can book a weekly recurring lesson |

## Create a package

1. Click **Add New Package**.
2. Choose a **Package Type**.
3. Fill in the fields (see below based on type), then click **Create Package**.

**One-time package fields:**
- **Name** — e.g. "5-Lesson Starter Pack"
- **Price** — the purchase price in dollars
- **Lesson Credits** — how many lessons the student receives
- **Lesson Duration** — 30 or 60 minutes (credits only apply to bookings of that duration)

**Membership package fields:**
- **Name** — e.g. "Monthly Membership"
- **Price** — the recurring charge amount
- **Billing Period** — number of days between billing cycles (typically `30` for monthly)

## Edit a package

1. Click **Manage** on any package card.
2. Update the fields in the **Package Details** tab.
3. A live preview shows how the package will appear to students.
4. Click **Save Changes**.

## Delete a package

1. Click **Manage** on the package.
2. Go to the **Actions** tab.
3. Click **Delete Package** and confirm.

You can also delete directly from the package list without opening the modal.

## Notes

- Deleting a package does not affect students who have already purchased it — their credits and subscriptions remain intact.
- Changes to a package (price, credits) only apply to future purchases.
- 30-minute and 60-minute credits are tracked separately — a student with 30-minute credits cannot use them for a 60-minute lesson.
