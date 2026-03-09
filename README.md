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
- **Google Calendar integration** with Service Account and OAuth support
- Instructor profiles and availability
- Student booking management
- Time-based booking restrictions (24-hour modification policy)
- Automated email notifications

## Quick Start

### Development (Local)

```bash
# 1. Clone and install
git clone <repository-url>
cd lesson-booking
npm run install:dev

# 2. Start backend
npm run dev
```

### Production Deployment

```bash
# 1. Clone repository
git clone <repository-url>
cd lesson-booking

# 2. Configure environment
cp .env.example .env
nano .env  # Set database credentials, JWT secret, Stripe keys, etc.
**Ensure `NODE_ENV=production` is set in `.env`**

# 3. Run production installer
npm run install:prod

# 4. (Optional) Enable auto-start on reboot
pm2 startup  # Run the command it outputs

# 5. (Optional) Set up HTTPS/SSL
npm run setup:ssl yourdomain.com
```

That's it! Your application is production-ready and accessible at `http://your-server-ip` (or your domain with HTTPS).

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
# Terminal 1: Backend (runs on port 3000)
npm run dev

# Terminal 2: Frontend (runs on port 5173)
cd frontend && npm run dev
```

Access at `http://localhost:5173` (Vite proxies API requests to backend)

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
- [`docs/GOOGLE_CALENDAR_INTEGRATION.md`](docs/GOOGLE_CALENDAR_INTEGRATION.md) - Google Calendar integration setup

### Permission Overview

| Role | Can Book | Can Manage Bookings | Can Manage Users | Can Access Payments | Can Process Refunds |
|------|----------|-------------------|------------------|-------------------|-------------------|
| **Student** | ✅ Own | ✅ Own (24hr limit) | ❌ | ✅ Own | ❌ (Auto-refund only) |
| **Instructor** | ❌ | ✅ Students' | ❌ | ❌ | ✅ Students' |
| **Admin** | ❌ | ✅ All | ✅ All | ❌ | ✅ All |

## Testing

To run tests:
```bash
npm test                 # Run all tests
npm run test:backend     # Backend tests only
npm run test:frontend    # Frontend tests only
npm run test:watch       # Watch mode for both
```

## Production Management

After installation with `npm run install:prod`, manage your application with:

```bash
# Application Management (PM2)
pm2 status                  # Check application status
pm2 logs lesson-booking     # View logs
pm2 restart lesson-booking  # Restart application
pm2 stop lesson-booking     # Stop application
pm2 monit                   # Monitor resources

# Nginx Management
sudo systemctl status nginx   # Check Nginx status
sudo systemctl restart nginx  # Restart Nginx
sudo nginx -t                 # Test configuration
sudo tail -f /var/log/nginx/lesson-booking-error.log  # View logs

# SSL Certificate Management (after running setup-ssl.sh)
sudo certbot certificates     # List certificates
sudo certbot renew            # Manually renew
```

## Troubleshooting

### Application won't start
- Check logs: `pm2 logs lesson-booking`
- Verify database connection in `.env`
- Ensure port 3000 is not in use: `lsof -i :3000`

### Can't access via web browser
- Check Nginx status: `sudo systemctl status nginx`
- Verify firewall: `sudo ufw status` (ports 80/443 should be allowed)
- Check Nginx logs: `sudo tail -f /var/log/nginx/lesson-booking-error.log`

### Database migration errors
- Check database credentials in `.env`
- Ensure PostgreSQL is running: `sudo systemctl status postgresql`
- Test connection: `psql -h localhost -U your_user -d your_database`

### SSL certificate issues
- Verify DNS points to your server: `dig +short yourdomain.com`
- Check port 80 is accessible: `curl -I http://yourdomain.com`
- Review certbot logs: `sudo tail -f /var/log/letsencrypt/letsencrypt.log`