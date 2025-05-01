# Lesson Booking Application

A web application for managing lesson bookings.

## Features

- User authentication and authorization
- Lesson scheduling and management
- Payment processing
- Instructor profiles and availability
- Student booking management

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

## Development

To run the application in development mode:
```bash
npm run dev
```

## Testing

To run tests:
```bash
npm test
``` 