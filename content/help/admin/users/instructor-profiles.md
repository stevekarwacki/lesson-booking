---
id: users-instructor-profiles
title: Create and edit an instructor profile
audience: admin
category: users
order: 6
uiRoute: /admin/users
uiTab: user-info
relatedComponents: [UserManager.vue, UserInfoTab.vue, InstructorDetailsForm.vue]
sources: [docs/USER_MANAGEMENT_FLOW.md]
keywords: [instructor, profile, bio, specialties, rate, hourly rate, create, edit, active, deactivate]
---

# Create and Edit an Instructor Profile

Instructor profiles hold the public-facing details shown to students — bio, specialties, and hourly rate. A profile is required before an instructor appears as bookable.

## Where to find it

> Users → find instructor → Manage → User Info tab

The instructor section of the User Info tab appears below the contact-information form whenever the user's role is set to Instructor.

## Steps

1. Find the instructor and click **Manage**.
2. Click the **User Info** tab (it opens by default).
3. Scroll past the contact information to the instructor section.
4. Fill in:
   - **Bio** — a short description shown to students
   - **Specialties** — areas of expertise (freeform text)
   - **Hourly Rate** — used for reference and reporting
5. Click **Save**.

## Notes

- An instructor profile is created automatically when a user's role is changed to Instructor. You're editing the existing profile here, not creating a new one from scratch.
- After setting up the profile, set the instructor's [availability](instructor-availability.md) so students can book them.

## Activating and deactivating an instructor

An instructor's active status controls whether they appear as bookable to students.

> Users → find instructor → Manage → **Account** tab → Instructor Status

Check or uncheck the **Active** checkbox and click **Save Status**. The current status is shown as a badge next to the checkbox.
