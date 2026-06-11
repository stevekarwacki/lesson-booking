---
id: users-approve-students
title: Approve a new student account
audience: admin
category: users
order: 3
uiRoute: /admin/users
uiTab: account
relatedComponents: [UserManager.vue]
sources: [docs/USER_PROFILE_VERIFICATION.md, docs/USER_MANAGEMENT_FLOW.md]
keywords: [approve, verification, student, access, unverified, pending, account status]
---

# Approve a New Student Account

Students must complete their profile and be approved before they can book lessons or make payments. Until approved, they can log in but cannot access those features.

## Where to find it

> Users → find student → Manage → Account tab

## Steps

1. Go to **Users** and open the **Unverified** tab to see students awaiting approval.
2. Click **Manage** on the student you want to review.
3. Check the **Profile** tab to confirm their information looks complete (phone, address, minor status).
4. Switch to the **Account** tab.
5. Toggle **Account Approved** to on.
6. Click **Save**.

The student now has full access to book lessons and manage payments.

## Understanding student states

A student moves through three states before they have full access:

1. **Incomplete profile** — they signed up but haven't filled in their phone, address, or minor status yet.
2. **Pending approval** — their profile is complete but you haven't approved them yet.
3. **Approved** — full access granted.

## Notes

- You can approve a student even if their profile is incomplete, but it's good practice to review it first.
- To revoke access, toggle **Account Approved** back to off.
- Instructors and admins do not go through an approval process.
