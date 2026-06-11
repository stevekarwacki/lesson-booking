---
id: users-in-person-payment-override
title: Override in-person payment for a specific student
audience: admin
category: users
order: 9
uiRoute: /admin/users
uiTab: account
relatedComponents: [UserManager.vue]
sources: [docs/IN_PERSON_PAYMENT_FEATURE.md]
keywords: [in-person, payment, cash, override, per-student, exception]
---

# Override In-Person Payment for a Specific Student

The global in-person payment setting applies to all students, but you can make exceptions for individual students — allowing or blocking it regardless of the global setting.

## Where to find it

> Users → find student → Manage → Account tab

## Steps

1. Open the student's **Account** tab.
2. Find the **In-Person Payment** override field and choose:
   - **Default** — follow the global setting (from [Lesson Settings](../settings/lessons-and-payments.md))
   - **Enabled** — allow this student to pay in person, even if disabled globally
   - **Disabled** — prevent this student from paying in person, even if enabled globally
3. Click **Save**.

## Notes

- This only affects the in-person payment option. Online and credit payments are not affected.
- Most students should stay on **Default**. Use overrides for specific exceptions only.
