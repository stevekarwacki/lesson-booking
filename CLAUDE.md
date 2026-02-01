# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack lesson booking application built with Express.js (backend) and Vue 3 (frontend). Students book lessons with instructors, manage subscriptions, and make payments through Stripe. The system features CASL-based permissions, time-based booking restrictions, and comprehensive refund capabilities.

## Common Commands

### Development
```bash
npm run dev                    # Start backend with nodemon
cd frontend && npm run dev     # Start frontend dev server separately
```

### Building
```bash
npm run build                  # Build frontend only
npm run deploy                 # Build frontend and start production server
```

### Testing
```bash
npm test                       # Run all tests (backend + frontend)
npm run test:backend           # Node.js test runner for backend tests
npm run test:frontend          # Vitest for Vue component tests
npm run test:integration       # End-to-end permission scenarios
npm run test:watch             # Watch mode for both (runs concurrently)
npm run test:backend:watch     # Watch mode for backend only
npm run test:frontend:watch    # Watch mode for frontend only
```

### Database
```bash
npx sequelize-cli db:migrate         # Run migrations
npx sequelize-cli db:migrate:undo    # Undo last migration
npx sequelize-cli db:seed:all        # Run all seeds
```

### Single Test Execution
```bash
# Backend (Node.js native test runner)
NODE_ENV=test node --test tests/permissions.test.js

# Frontend (Vitest)
cd frontend && npm run test -- booking-modal.test.js
```

## Architecture

### Backend Structure

**Models** (`/models/`): Sequelize ORM models with associations defined in `models/index.js`. Key models include:
- `User` - Students, instructors, and admins (role-based)
- `Calendar` - Lesson bookings with student_id, instructor_id, date, start_slot, duration
- `Instructor` - Instructor profiles linked to User records
- `Credits` - Student payment balances and subscription tracking
- `Subscription` - Recurring payment plans via Stripe
- `Refund` - Refund tracking with credit restoration

**Routes** (`/routes/`): Express routes following RESTful patterns:
- `auth.js` - Login, signup, JWT token management
- `admin.js` - User management, booking oversight, refund processing
- `calendar.js` - Booking CRUD, rescheduling, cancellation
- `payments.js` - Stripe integration, credit purchases
- `instructors.js` - Instructor profiles and management
- `instructorAvailability.js` - Schedule management
- `subscriptions.js` - Subscription lifecycle management
- `recurringBookings.js` - Recurring booking patterns

**Services** (`/services/`):
- `EmailService.js` - Handlebars template rendering, Nodemailer integration with database-backed SMTP configuration
- `GoogleCalendarService.js` - OAuth flow, event sync to instructor calendars
- `RefundService.js` - Stripe refunds, credit restoration logic
- `CronJobService.js` - Scheduled tasks (email reminders, credit expiry)
- `EmailQueueService.js` - Queued email processing

**Middleware** (`/middleware/`):
- `auth.js` - JWT verification, role extraction (authMiddleware, adminMiddleware, instructorMiddleware)
- `permissions.js` - CASL authorization checks (authorize, authorizeResource, authorizeBooking)
- `staticFiles.js` - Secure file serving for uploads

**Utils** (`/utils/`):
- `abilities.js` - CASL permission definitions (defineAbilitiesFor, can, canBookingAction)
- `dateHelpers.js` - Date manipulation and comparison (today, fromString, createDateHelper)
- `timeUtils.js` - Timezone handling, slot calculations
- `creditValidation.js` - Credit balance validation
- `paymentValidation.js` - In-person payment eligibility checks
- `logger.js` - Colored console logging

### Frontend Structure

**Components** (`/frontend/src/components/`):
- `InstructorCalendar.vue` - Weekly calendar grid for booking
- `BookingList.vue` - Student's bookings with filtering
- `BookingModal.vue` - Booking creation flow
- `EditBooking.vue` - Rescheduling and cancellation
- `RefundModal.vue` - Refund initiation UI
- `PackageManager.vue` - Admin package/pricing configuration
- `StripePaymentForm.vue` - Credit purchase with Stripe Elements
- `NavBar.vue` - Role-based navigation
- `InstructorManager.vue` - Admin instructor management
- `GoogleCalendarSettings.vue` - Instructor calendar sync setup

**Stores** (`/frontend/src/stores/`): Pinia for state management
- `userStore.js` - Auth state, user info, CASL ability getters
- `scheduleStore.js` - Booking data, calendar state
- `instructorStore.js` - Instructor profiles and availability
- Additional stores for specific features

**Router** (`/frontend/src/router/index.js`):
- Route guards using CASL permissions
- Role-based redirects (students, instructors, admins)

**Utils** (`/frontend/src/utils/`):
- `abilities.js` - Frontend mirror of backend CASL permissions
- `dateHelpers.js` - Date utilities matching backend
- Other shared utilities

### Key Architectural Patterns

**CASL Permission System**:
- Centralized in `utils/abilities.js` (backend) and `frontend/src/utils/abilities.js` (frontend)
- Role-based rules with resource ownership conditions
- Time-based restrictions (24-hour booking policy for students)
- Permission getters in `userStore` (e.g., `canCreateStudentBooking`, `canEditSpecificUserRole`)
- Middleware functions: `authorize(action, subject)`, `authorizeResource(resource, action)`, `authorizeBooking(booking, action)`
- **CRITICAL**: Always keep frontend and backend abilities synchronized
- See `/docs/CASL_PERMISSIONS_GUIDE.md` for comprehensive documentation

**Date Handling System**:
- All date operations use `dateHelpers.js` for consistency
- `createDateHelper(date, timezone)` returns chainable helper object
- Comparison methods: `isToday()`, `isSameDay()`, `isPast()`, `isFuture()`
- Business logic: `isWithinCancellationWindow(hours)`, `diffInHours(other)`
- Manipulation: `addDays()`, `addHours()`, `addMinutes()`, `addWeeks()`, `addMonths()`
- Never use raw `new Date()` - always use date helpers
- See `/docs/DATE_HELPERS_SYSTEM.md` for API reference

**Booking Time Slots**:
- Slots are 15-minute increments starting at 6:00 AM
- `start_slot` values: 0 = 6:00 AM, 4 = 7:00 AM, 8 = 8:00 AM, etc.
- Duration stored in slots: 2 slots = 30 min, 4 slots = 60 min
- `timeUtils.js` provides slot-to-time conversion functions
- Booking validation checks instructor availability and conflicts

**Credit System**:
- 30-minute lessons deduct 1 30-minute credit
- 60-minute lessons deduct 1 60-minute credit
- Credits stored in `Credits` model per student
- Validation in `creditValidation.js` before booking
- Restoration on cancellation/refund via `RefundService.js`

**Refund Flow**:
- Instructor-initiated or admin-initiated refunds
- Stripe refunds processed via `RefundService.js`
- Credits restored to student account automatically
- Refund records tracked in `Refund` model
- See `/docs/REFUND_SYSTEM.md` for detailed workflow

**Email Templates**:
- Handlebars templates in `/email-templates/`
- Structure: `base/` (layouts), `contents/` (email types), `partials/` (reusable components)
- Always use `EmailService` for sending, never direct Nodemailer calls
- Templates support purchase confirmations, reminders, credit notifications

**Stripe Integration**:
- Payment Intents API for credit purchases
- Subscription management via Stripe Subscriptions API
- Webhook handling for subscription events
- Test mode configuration in `.env` (never commit keys)
- See `/docs/STRIPE_INTEGRATION_GUIDE.md`

## Development Workflow

### Branch Strategy
Create feature branches from main:
- `feat/descriptive-name` for new features
- `fix/descriptive-name` for bug fixes
- `chore/descriptive-name` for maintenance

### Commit Message Format
Follow Conventional Commits:
```
feat(api): add endpoint for student lesson booking
fix(ui): prevent double submission on booking form
refactor(auth): simplify token validation logic
```

### Pre-commit and Pre-push Hooks
- **Pre-commit**: Blocks `console.log` in production code
- **Pre-push**: Runs full test suite (`npm test`)
- Bypass only in emergencies with `--no-verify`

### Testing Requirements
- Unit tests for isolated logic (utilities, Pinia actions)
- Integration tests for multi-component interactions (API routes + DB)
- Frontend tests with Vitest for Vue components
- Use descriptive test names: "should [behavior] when [condition]"
- Mock external services (Stripe, Google APIs, email)
- Tests must pass before merging to main

### Semantic Versioning
After merging to main:
- **PATCH** (x.x.1) for bug fixes
- **MINOR** (x.1.0) for new features
- **MAJOR** (2.0.0) for breaking changes

## Configuration

### Environment Variables
- Copy `.env.example` to `.env`
- Required: `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `ENCRYPTION_KEY`
- Optional: `REDIS_URL`, `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `GOOGLE_CLIENT_ID`
- SMTP can be configured via admin UI (preferred) or environment variables (fallback)
- Cache falls back to memory if Redis not configured
- Email service logs attempts if not configured

### Database Configuration
- Development: SQLite (`lesson_booking.db`)
- Production: PostgreSQL via `DATABASE_URL`
- Sequelize config in `config/database.js`
- Models initialized in `models/index.js`

### Frontend Build Configuration
- Vite for build tooling (`vite.config.js`)
- Vue 3 with `<script setup>` SFCs
- Responsive breakpoints via `vue3-mq`
- Output to `frontend/dist/` (served by Express in production)

## Important Notes

### Security Rules
- **NEVER** commit API keys, tokens, or credentials to version control
- Use environment variables exclusively for sensitive data
- Mock external APIs in tests (no live requests)
- All routes protected by `authMiddleware` unless explicitly public

### Functional Programming Style
- Prefer functional patterns over classes
- Use async/await for asynchronous operations
- No raw SQL queries - always use Sequelize

### CASL Permission Checks
- Always use permission getters instead of direct role checks
- Example: `userStore.canCreateStudentBooking` NOT `user.role === 'student'`
- Check resource ownership: `ability.can('update', booking)`
- Time-based restrictions handled by `canBookingAction(user, booking, action)`

### Date Operations
- Use `dateHelpers.js` functions exclusively
- Never use `new Date()` directly
- Always pass timezone where applicable
- Use business logic helpers like `isWithinCancellationWindow(24)`

### Documentation
- README.md for high-level overview
- `/docs/` for complex feature deep-dives
- Inline comments for non-obvious logic only
- Update documentation when adding features (not for bug fixes)

## Detailed Documentation

For in-depth guides on specific features:
- `/docs/CASL_PERMISSIONS_GUIDE.md` - Permission system and authorization
- `/docs/DATE_HELPERS_SYSTEM.md` - Date handling API reference
- `/docs/60_MINUTE_LESSON_FEATURES.md` - Duration-based pricing and scheduling
- `/docs/REFUND_SYSTEM.md` - Refund workflows and credit restoration
- `/docs/IN_PERSON_PAYMENT_FEATURE.md` - In-person payment configuration
- `/docs/STRIPE_INTEGRATION_GUIDE.md` - Payment processing setup
- `/docs/SMTP_CONFIGURATION_GUIDE.md` - Self-service SMTP email setup
- `/docs/LOGO_UPLOAD_FEATURE.md` - Branding and file upload handling
- `/docs/ATTENDANCE_TRACKING_FEATURE.md` - Attendance marking system
- `/docs/BUSINESS_INFORMATION_FEATURE.md` - Business settings management
- `/docs/TESTING_GUIDE.md` - Comprehensive testing documentation
