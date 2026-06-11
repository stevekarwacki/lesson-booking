---
id: users-change-roles
title: Change a user's role
audience: admin
category: users
order: 4
uiRoute: /admin/users
uiTab: account
relatedComponents: [UserManager.vue]
sources: [docs/USER_MANAGEMENT_FLOW.md]
keywords: [role, student, instructor, admin, change role, permissions]
---

# Change a User's Role

Switch a user between student, instructor, and admin roles from their Account tab.

## Where to find it

> Users → find user → Manage → Account tab

## Steps

1. Find the user and click **Manage**.
2. Go to the **Account** tab.
3. Select the new role from the **Role** dropdown.
4. Click **Save**.

## What changes when a role changes

**Student → Instructor:** An instructor profile is created automatically. The Instructor Details and Availability tabs will appear in their modal. Any existing student data (bookings, subscriptions) is kept.

**Instructor → Student:** The instructor profile is kept but hidden. If the role is changed back to instructor later, the existing profile is restored. Instructor tabs are hidden.

**Any role → Admin:** All existing data is kept. The Account tab becomes visible to you when managing that user.

## Notes

- Role changes take effect immediately after saving.
- Changing a role does not delete any existing data.
- Only one admin account can manage others — be careful when changing your own account's role.
