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

Profile completion and approval are tracked separately. The system won't prevent you from approving a student with an incomplete profile, but the standard process is to verify the profile is complete first — phone number, address, and minor status are all required before you approve. The business contact number is also only shown to students once their profile is complete, encouraging them to call in and complete verification before you approve them.

## Where to find it

> Users → find student → Manage → Account tab

## Steps

1. Go to **Users** and open the **Unverified** tab to see students awaiting approval.
2. Click **Manage** on the student you want to review.
3. Check the **User Info** tab to confirm phone number, address, and minor status are all filled in.
4. Switch to the **Account** tab.
5. Toggle **Account Approved** to on.
6. Click **Save**.

The student now has full access to book lessons and manage payments.

## Understanding student states

| State | What it means |
|---|---|
| **Unapproved, incomplete profile** | Student cannot book or pay. Sees a "Complete your Profile" prompt. |
| **Unapproved, complete profile** | Student cannot book or pay. Sees an "Account Pending Approval" banner. |
| **Approved** | Full access granted regardless of profile completeness. |

## Notes

- The standard process is to confirm the profile is complete before approving. The system does not hard-block approval of an incomplete profile, but this should only be used when an admin intentionally needs to make an exception.
- An approved student with an incomplete profile will see a "Complete your Profile" prompt but is not blocked from booking.
- To revoke access, toggle **Account Approved** back to off.
- Instructors and admins do not go through an approval process.
