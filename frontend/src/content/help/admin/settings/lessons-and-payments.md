---
id: settings-lessons-payments
title: Configure lesson and payment settings
audience: admin
category: settings
order: 3
uiRoute: /admin/settings
uiTab: lessons
relatedComponents: [LessonsSection.vue]
sources: [docs/60_MINUTE_LESSON_FEATURES.md, docs/IN_PERSON_PAYMENT_FEATURE.md, docs/BOOK_ON_BEHALF_FEATURE.md]
keywords: [lesson duration, in-person payment, card payment, order on behalf, default duration]
---

# Configure Lesson and Payment Settings

Control the default lesson duration and which payment methods are available when booking on behalf of a student.

## Where to find it

> Settings → Lesson Settings

## Default lesson duration

Sets the default duration (in minutes) used when creating lesson credits or making unspecified bookings. Individual bookings can still use a different duration if credits exist for it.

1. Select the default duration from the dropdown (15–120 minutes).
2. Click **Save Lesson Settings**.

## In-person payments

When enabled, students can choose to pay in person at the time of their lesson rather than online.

1. Toggle **Allow In-Person Payments** on or off.
2. Click **Save Lesson Settings**.

> You can override this setting per student from their Account tab in User Management.

## Card payment when booking on behalf

By default, when you or an instructor books a lesson for a student, only in-person payment and credits are available. This toggle adds card payment as an option.

1. Toggle **Allow Card Payment in Order-on-Behalf-Of** on or off.
2. Click **Save Lesson Settings**.

> This is off by default. Only enable it if your workflow requires charging cards during proxy bookings.
