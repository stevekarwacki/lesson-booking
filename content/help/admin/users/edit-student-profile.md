---
id: users-edit-student-profile
title: Edit a student's profile
audience: admin
category: users
order: 5
uiRoute: /admin/users
uiTab: user-info
relatedComponents: [UserManager.vue, Profile.vue, UserInfoTab.vue]
sources: [docs/ADMIN_PROFILE_EDITING.md, docs/USER_PROFILE_VERIFICATION.md]
keywords: [student, profile, name, email, phone, address, minor, parent, edit]
---

# Edit a Student's Profile

Update any student's contact information, address, or minor status on their behalf.

## Where to find it

> Users → find student → Manage → User Info tab

## Steps

1. Search for the student and click **Manage**.
2. The **User Info** tab opens by default.
3. Update any of the fields:
   - Name and email
   - Phone number
   - Address (street, city, state, ZIP)
   - Minor status — check **Under 18** if applicable; a parental approval checkbox will appear and must also be checked
4. Click **Update Profile**.

## Notes

- Completing a student's profile on their behalf counts toward their verification status. If all required fields are filled, their profile will be marked complete and they'll move to the "Pending Approval" stage.
- You cannot change a student's password from here — they must reset it themselves via login.
- To change a student's role, use the [Account tab](change-roles.md).
- Address state must be a 2-letter code (e.g. `CA`, `NY`). ZIP must be 5 digits or ZIP+4 format.
