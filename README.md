# Lesson Booking Application

A web application for managing lesson bookings.

## Features

- User authentication and authorization
- **CASL-based permission system** with role-based access control
- Lesson scheduling and management
- Payment processing with email confirmations
- Instructor profiles and availability
- Student booking management
- Time-based booking restrictions (24-hour modification policy)
- Automated email notifications

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure your environment variables
4. Run the application:
   ```bash
   npm start
   ```

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

For detailed documentation, see [`docs/CASL_PERMISSIONS_GUIDE.md`](docs/CASL_PERMISSIONS_GUIDE.md)

### Permission Overview

| Role | Can Book | Can Manage Bookings | Can Manage Users | Can Access Payments |
|------|----------|-------------------|------------------|-------------------|
| **Student** | ✅ Own | ✅ Own (24hr limit) | ❌ | ✅ Own |
| **Instructor** | ❌ | ✅ Students' | ❌ | ❌ |
| **Admin** | ❌ | ✅ All | ✅ All | ❌ |

## Testing

To run tests:
```bash
npm test
```

The test suite includes:
- **68 total tests** covering permissions, routes, and integration
- Backend permission validation
- Frontend router guard testing  
- Time-based restriction verification 