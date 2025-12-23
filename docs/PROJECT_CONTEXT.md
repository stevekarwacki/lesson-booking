# Project Context

A full-stack lesson booking application where students book lessons with instructors, manage payments through Stripe, and track credits. Built for music/tutoring businesses.

## Tech Stack

- **Backend**: Node.js, Express.js, Sequelize ORM
- **Frontend**: Vue 3 (Composition API), Pinia stores, Vite
- **Database**: SQLite (dev), PostgreSQL (prod)
- **Payments**: Stripe (one-time purchases + subscriptions)
- **Auth**: JWT tokens, CASL permission library
- **Email**: Nodemailer, Gmail OAuth
- **Calendar**: Google Calendar API (OAuth or service account)

## Core Domains

| Domain | Description |
|--------|-------------|
| **Users** | Students, instructors, admins (role-based) |
| **Bookings** | Lesson scheduling with date/time slots, rescheduling, cancellation |
| **Credits** | Prepaid lesson credits (30-min and 60-min types) |
| **Subscriptions** | Recurring Stripe subscriptions for credit packages |
| **Instructors** | Profiles, availability schedules, calendar sync |
| **Refunds** | Stripe refunds with automatic credit restoration |
| **Packages** | Purchasable credit bundles with pricing tiers |

## Key Integrations

| Integration | Purpose | Status |
|-------------|---------|--------|
| **Stripe Payments** | Credit purchases, subscription billing, refunds | Production |
| **Google Calendar** | Instructor calendar sync (read events for availability) | Production |
| **Gmail OAuth** | Send emails via instructor's Gmail account | Production |
| **Email Templates** | Handlebars templates for transactional emails | Production |

## Business Rules

- **24-hour policy**: Students cannot modify bookings within 24 hours of lesson time, Instructors and Admins may
- **Credit types**: 30-minute and 60-minute credits are separate, non-interchangeable
- **Instructor ownership**: Instructors can only manage their own students' bookings
- **Admin override**: Admins can bypass most restrictions

## Feature Areas

| Area | Maturity | Notes |
|------|----------|-------|
| User auth & roles | Stable | JWT + CASL permissions |
| Booking management | Stable | Full CRUD, rescheduling, recurring bookings |
| Credit system | Stable | Purchase, deduction, restoration |
| Stripe integration | Stable | Payments, subscriptions, webhooks |
| Instructor availability | Stable | Weekly schedule management |
| Google Calendar sync | Stable | OAuth and service account flows |
| Email notifications | Stable | Booking confirmations, reminders |
| Admin dashboard | Stable | User management, refunds, settings |
| Theming/branding | Stable | Logo upload, color customization |
| Attendance tracking | Stable | Mark lessons as attended/absent |
| In-person payments | Stable | Cash/check payment option |

## Architecture Notes

- **Permissions**: Centralized CASL rules in `utils/abilities.js`, mirrored in frontend
- **Date handling**: Custom `dateHelpers.js` for timezone-aware operations
- **Time slots**: 15-minute increments starting at 6 AM (slot 0 = 6:00 AM)
- **Email providers**: Configurable (Gmail OAuth vs Nodemailer) with fallback chain
- **Functional style**: Prefer functions over classes throughout codebase

## Current Priorities Context

- OAuth calendar/email integration recently stabilized
- Test suite maintained at 229+ backend tests, 73+ frontend tests
- Documentation kept in `/docs/` for complex features

