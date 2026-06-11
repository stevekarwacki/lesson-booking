---
id: users-delete
title: Delete a user account
audience: admin
category: users
order: 10
uiRoute: /admin/users
uiTab: account
relatedComponents: [UserManager.vue]
sources: [docs/USER_MANAGEMENT_FLOW.md]
keywords: [delete, remove, user, account, permanent]
---

# Delete a User Account

Permanently remove a user and their account from the system.

## Where to find it

> Users → find user → Manage → Account tab → Delete Account

## Steps

1. Open the user's **Account** tab.
2. Scroll to the **Danger Zone** section.
3. Click **Delete Account**.
4. Confirm the deletion when prompted.

## Notes

- **This cannot be undone.** The account and associated data are permanently deleted.
- Consider whether you need to cancel any active subscriptions or process any outstanding refunds before deleting.
- If you just want to prevent a student from logging in or booking, [removing their approval](approve-students.md) is a safer option than deletion.
