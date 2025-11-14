/**
 * Centralized Configuration Module
 * All environment variable access should go through this module
 */

// Helper functions for type coercion
const toBoolean = (value) => value === 'true';
const toNumber = (value, defaultValue) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
};

// Feature Flags
const features = {
    oauthEmail: toBoolean(process.env.USE_OAUTH_EMAIL),
    oauthCalendar: toBoolean(process.env.USE_OAUTH_CALENDAR)
};

// Database Configuration
const database = {
    dialect: process.env.DB_DIALECT,
    host: process.env.DB_HOST,
    port: toNumber(process.env.DB_PORT, 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    storage: process.env.DB_STORAGE,
    ssl: toBoolean(process.env.DB_SSL)
};

// Authentication Configuration
const auth = {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    sessionSecret: process.env.SESSION_SECRET
};

// Email Configuration
const email = {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_APP_PASSWORD,
    from: process.env.EMAIL_FROM
};

// Google OAuth Configuration
const googleOAuth = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    scopes: process.env.GOOGLE_OAUTH_SCOPES?.split(' ') || [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/gmail.send'
    ]
};

// Google Service Account Configuration
const googleServiceAccount = {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE
};

// Stripe Configuration
const stripe = {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
};

// Storage Configuration
const storage = {
    provider: process.env.STORAGE_PROVIDER || 'local',
    localPath: process.env.STORAGE_LOCAL_PATH || './uploads',
    s3: {
        bucket: process.env.AWS_S3_BUCKET,
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
};

// Server Configuration
const server = {
    port: toNumber(process.env.PORT, 3000),
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};

// Redis Configuration
const redis = {
    host: process.env.REDIS_HOST,
    port: toNumber(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD,
    db: toNumber(process.env.REDIS_DB, 0)
};

// Validation helpers
const validators = {
    isConfigured: (...values) => values.every(v => v !== undefined && v !== null && v !== ''),
    
    requireConfig: (name, value) => {
        if (!value) {
            throw new Error(`Required configuration missing: ${name}`);
        }
        return value;
    }
};

// Export organized config
module.exports = {
    features,
    database,
    auth,
    email,
    googleOAuth,
    googleServiceAccount,
    stripe,
    storage,
    server,
    redis,
    validators
};

