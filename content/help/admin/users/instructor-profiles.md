---
id: users-instructor-profiles
title: Create and edit an instructor profile
audience: admin
category: users
order: 6
uiRoute: /admin/users
uiTab: instructor-details
relatedComponents: [UserManager.vue]
sources: [docs/USER_MANAGEMENT_FLOW.md]
keywords: [instructor, profile, bio, specialties, rate, hourly rate, create, edit]
---

# Create and Edit an Instructor Profile

Instructor profiles hold the public-facing details shown to students — bio, specialties, and hourly rate. A profile is required before an instructor appears as bookable.

## Where to find it

> Users → find instructor → Manage → Instructor Details tab

If the user's role is set to Instructor but the tab isn't visible, their role may not be saved yet — check the Account tab.

## Steps

1. Find the instructor and click **Manage**.
2. Click the **Instructor Details** tab.
3. Fill in:
   - **Bio** — a short description shown to students
   - **Specialties** — areas of expertise (freeform text)
   - **Hourly Rate** — used for reference and reporting
4. Click **Save**.

## Notes

- An instructor profile is created automatically when a user's role is changed to Instructor. You're editing the existing profile here, not creating a new one from scratch.
- Deleting the instructor profile from this tab will revert the user's role to Student.
- After setting up the profile, set the instructor's [availability](instructor-availability.md) so students can book them.
