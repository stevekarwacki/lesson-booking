# Lesson Booking Application

A web application for managing lesson bookings.

## Features

- User authentication and authorization
- **CASL-based permission system** with role-based access control
- **Lesson scheduling and management** with 30 and 60-minute durations
- **Duration-based pricing** (60-minute lessons cost 2x the 30-minute rate)
- **Smart rescheduling** with duration preservation and conflict detection
- **Business hours management** with automatic availability enforcement
- **In-person payment system** with configurable global/per-student settings
- **Comprehensive refund system** with Stripe integration and credit restoration
- Payment processing with email confirmations
- Instructor profiles and availability
- Student booking management
- Time-based booking restrictions (24-hour modification policy)
- Automated email notifications

## Installation

### Quick Start

```bash
# 1. Install dependencies
npm install
cd frontend && npm install && cd ..

# 2. Start the application (migrations and seeds run automatically)
npm start
```

**That's it!** The application will:
- ✅ Automatically create all database tables
- ✅ Seed a default admin user (`admin@example.com` / `admin123`)
- ✅ Set up default application settings
- ✅ Start the server on http://localhost:3000

⚠️ **Important:** Change the default admin password after first login!

### Custom Configuration

1. Create a `.env` file with your settings:
   ```bash
   ADMIN_EMAIL=your-admin@domain.com
   ADMIN_PASSWORD=your-secure-password
   JWT_SECRET=your-super-secret-jwt-key
   STRIPE_SECRET_KEY=sk_test_...
   ```

2. Start the application:
   ```bash
   npm start
   ```

📖 **For detailed installation instructions**, see [`docs/INSTALLATION_GUIDE.md`](docs/INSTALLATION_GUIDE.md)

## Caching Options

The application supports multiple caching solutions:

### Memory Cache (Default)
The memory cache is enabled by default and requires no additional setup. It's suitable for development and small deployments.

### Redis Cache
For production environments or when you need distributed caching, Redis can be used:

1. Install Redis:
   ```bash
   npm install redis
   ```
2. Configure Redis in your `.env` file:
   ```
   CACHE_TYPE=redis
   REDIS_URL=redis://localhost:6379
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your_password
   REDIS_DB=0
   ```

Note: Redis is an optional dependency. If Redis is not installed and configured, the application will automatically fall back to the memory cache.

## Email Configuration

The application supports automated email notifications for purchase confirmations and scheduled reminders.

### Gmail Setup (Recommended)

1. **Enable 2-Step Verification** on your Google account
2. **Generate an App Password**:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Under "Signing in to Google," click "App passwords"
   - Select "Mail" and "Other (Custom name)", name it "Lesson Booking App"
   - Copy the 16-character password generated

3. **Configure your `.env` file**:
   ```
   EMAIL_USER=your-email@yourdomain.com
   EMAIL_APP_PASSWORD=your-16-digit-app-password
   EMAIL_FROM_NAME=Your Business Name
   ```

### Email Features

- **Purchase Confirmations**: Sent immediately after successful payments
- **Low Balance Warnings**: Scheduled notifications when credits are running low
- **Credit Expiry Reminders**: Notifications about expiring lesson credits

Note: Email service is optional. If not configured, the application will log email attempts and continue normal operation.

## Development

To run the application in development mode:
```bash
npm run dev
```

## Permissions System

This application uses **CASL (Conditional Access Control List)** for comprehensive permission management:

- **Role-based permissions**: Students, Instructors, and Admins have different capabilities
- **Resource ownership**: Users can only access/modify their own data
- **Time-based restrictions**: 24-hour booking modification policy for students
- **Frontend/Backend sync**: Identical permission definitions across the stack

For detailed documentation, see:
- [`docs/CASL_PERMISSIONS_GUIDE.md`](docs/CASL_PERMISSIONS_GUIDE.md) - Permission system
- [`docs/60_MINUTE_LESSON_FEATURES.md`](docs/60_MINUTE_LESSON_FEATURES.md) - 60-minute lesson functionality
- [`docs/REFUND_SYSTEM.md`](docs/REFUND_SYSTEM.md) - Comprehensive refund system
- [`docs/BUSINESS_HOURS_AVAILABILITY_FEATURE.md`](docs/BUSINESS_HOURS_AVAILABILITY_FEATURE.md) - Business hours and availability management

### Permission Overview

| Role | Can Book | Can Manage Bookings | Can Manage Users | Can Access Payments | Can Process Refunds |
|------|----------|-------------------|------------------|-------------------|-------------------|
| **Student** | ✅ Own | ✅ Own (24hr limit) | ❌ | ✅ Own | ❌ (Auto-refund only) |
| **Instructor** | ❌ | ✅ Students' | ❌ | ❌ | ✅ Students' |
| **Admin** | ❌ | ✅ All | ✅ All | ❌ | ✅ All |

## Testing

To run tests:
```bash
npm test
```