# Installation Guide

This guide walks you through setting up the Lesson Booking Application from scratch.

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- SQLite3 (for development) or PostgreSQL (for production)

## Quick Start (Development)

For a fresh installation with default settings:

```bash
# 1. Clone the repository
git clone <repository-url>
cd lesson-booking

# 2. Install dependencies
npm install
cd frontend && npm install && cd ..

# 3. Start the application
npm start
```

That's it! The application will:
- ✅ Automatically run all database migrations
- ✅ Detect it's a fresh install and run seeds
- ✅ Create a default admin user
- ✅ Set up default application settings
- ✅ Start the server

**Default Admin Credentials:**
- Email: `admin@example.com`
- Password: `admin123`

⚠️ **Important:** Change these credentials immediately after first login!

## Custom Installation

### Step 1: Environment Configuration

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (SQLite - Development)
DB_DIALECT=sqlite
DB_STORAGE=./db/database.sqlite

# Database Configuration (PostgreSQL - Production)
# DB_DIALECT=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=your_username
# DB_PASSWORD=your_password
# DB_NAME=lesson_booking
# DB_SSL=true

# JWT Secret (REQUIRED - generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this

# Admin User (Optional - customize default admin)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure-admin-password

# Stripe Configuration (Required for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email Configuration (Optional)
EMAIL_USER=your-email@yourdomain.com
EMAIL_APP_PASSWORD=your-16-digit-app-password
EMAIL_FROM_NAME=Your Business Name

# Redis Cache (Optional - for distributed deployments)
CACHE_TYPE=redis
REDIS_URL=redis://localhost:6379
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=your_password
# REDIS_DB=0

# Google Calendar Integration (Optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Step 2: Install Dependencies

```bash
# Backend dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### Step 3: Start the Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode (builds frontend and starts server)
npm run deploy

# Or just start the server (migrations run automatically)
npm start
```

## Database Initialization Process

The application uses an **automatic migration system** that ensures database setup is turn-key:

### On First Startup

1. **Migrations Run Automatically**
   - All table schemas are created in the correct order
   - Foreign key relationships are established
   - Indexes are created for performance

2. **Fresh Install Detection**
   - Application checks if any users exist in the database
   - If no users found, it's considered a fresh installation

3. **Automatic Seeding** (Fresh Install Only)
   - Creates default admin user with credentials from `.env` (or defaults)
   - Sets up default application settings:
     - Default lesson duration: 30 minutes
     - In-person payments: disabled
     - Business timezone: UTC
   - Initializes email template system

4. **Server Starts**
   - Application is ready to use immediately

### On Subsequent Startups

- Only pending migrations are run (safe to run multiple times)
- Seeds are skipped (admin already exists)
- Existing data is preserved

### Manual Seed Control

If you need to re-run seeds manually:

```bash
RUN_SEEDS=true npm start
```

## Database Migrations

### View Migration Status

```bash
npx sequelize-cli db:migrate:status
```

### Run Pending Migrations Manually

```bash
npx sequelize-cli db:migrate
```

### Rollback Last Migration (Development Only)

```bash
npx sequelize-cli db:migrate:undo
```

## Production Deployment

### PostgreSQL Setup

1. Create PostgreSQL database:
```sql
CREATE DATABASE lesson_booking;
```

2. Update `.env` with PostgreSQL credentials:
```bash
NODE_ENV=production
DB_DIALECT=postgres
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=lesson_booking
DB_SSL=true
```

3. Deploy and start:
```bash
npm run deploy
```

The application will automatically:
- Run all migrations on the production database
- Seed admin user and default settings (if fresh install)
- Build and serve the frontend
- Start the production server

### Important Security Notes

1. **Change Default Credentials**: Immediately after first login, update the admin password
2. **JWT Secret**: Use a strong, random secret in production
3. **Database Passwords**: Never commit `.env` files to version control
4. **Stripe Keys**: Use production keys (not test keys) in production
5. **Email Configuration**: Set up proper email credentials for notifications

## Troubleshooting

### Migration Failures

If migrations fail, check:
- Database connection settings in `.env`
- Database user has proper permissions
- No existing database conflicts

Reset database (⚠️ destroys all data):
```bash
rm -f db/database.sqlite  # SQLite only
npm start  # Will recreate from scratch
```

### Seeds Not Running

Seeds only run automatically on fresh installations. To force re-run:
```bash
RUN_SEEDS=true npm start
```

### Email Service Warnings

If you see email warnings, it's safe to ignore if you haven't configured email yet. The application works fine without email - it will just log attempts instead of sending.

### File Type Error

If you encounter `ERR_PACKAGE_PATH_NOT_EXPORTED` with `file-type`, ensure you're using `file-type@16.5.4` (not v18+):
```bash
npm install file-type@16.5.4
```

## Development Workflow

```bash
# Start backend with auto-reload
npm run dev

# Start frontend dev server (separate terminal)
cd frontend && npm run dev

# Run tests
npm test

# Run migrations manually
npx sequelize-cli db:migrate

# Create a new migration
npx sequelize-cli migration:generate --name your-migration-name
```

## First Steps After Installation

1. **Login** with default admin credentials
2. **Change admin password** in account settings
3. **Configure business settings**:
   - Upload logo
   - Set business information
   - Configure timezone
   - Set up payment plans
4. **Create instructors** and set their availability
5. **Configure Stripe** for payment processing
6. **(Optional) Set up email** for notifications
7. **(Optional) Configure Google Calendar** integration

## Support

For issues or questions:
- Check the documentation in `/docs`
- Review the troubleshooting section above
- Check existing GitHub issues
- Create a new issue with detailed error information

## Migration System Overview

The application uses a **date-based migration naming** convention:

```
20240101000001-create-users-table.js          # Base tables
20240101000002-create-instructors-table.js
...
20240101000016-create-email-templates.js      # More base tables
20240102000001-add-duration-to-credits.js     # Feature additions
...
```

This ensures migrations run in the correct order regardless of when features were added to the codebase.

