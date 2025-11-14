/**
 * Simple logger utility for the lesson booking application
 * Provides consistent logging across the application with environment-aware output
 */

const config = require('../config');

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

// Module-level state
const getLogLevel = () => {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
        case 'error': return LOG_LEVELS.ERROR;
        case 'warn': return LOG_LEVELS.WARN;
        case 'info': return LOG_LEVELS.INFO;
        case 'debug': return LOG_LEVELS.DEBUG;
        default: 
            // Default: INFO in production, DEBUG in development
            return config.server.nodeEnv === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
    }
};

const logLevel = getLogLevel();
const isProduction = config.server.nodeEnv === 'production';

const formatMessage = (level, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (isProduction) {
        // Structured logging for production (JSON format)
        return JSON.stringify({
            timestamp,
            level: level.toLowerCase(),
            message,
            ...meta
        });
    } else {
        // Human-readable format for development
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${prefix} ${message}${metaStr}`;
    }
};

const log = (level, message, meta = {}) => {
    const levelValue = LOG_LEVELS[level.toUpperCase()];
    
    if (levelValue <= logLevel) {
        const formattedMessage = formatMessage(level, message, meta);
        
        // Use appropriate console method
        switch (level.toLowerCase()) {
            case 'error':
                // eslint-disable-next-line no-console
                console.error(formattedMessage);
                break;
            case 'warn':
                // eslint-disable-next-line no-console
                console.warn(formattedMessage);
                break;
            default:
                // eslint-disable-next-line no-console
                // console.log(formattedMessage);
        }
    }
};

const error = (message, meta = {}) => {
    log('ERROR', message, meta);
};

const warn = (message, meta = {}) => {
    log('WARN', message, meta);
};

const info = (message, meta = {}) => {
    log('INFO', message, meta);
};

const debug = (message, meta = {}) => {
    log('DEBUG', message, meta);
};

// Convenience methods for common use cases
const server = (message, meta = {}) => {
    info(`[SERVER] ${message}`, meta);
};

const email = (message, meta = {}) => {
    info(`[EMAIL] ${message}`, meta);
};

const queue = (message, meta = {}) => {
    debug(`[QUEUE] ${message}`, meta);
};

const auth = (message, meta = {}) => {
    info(`[AUTH] ${message}`, meta);
};

const db = (message, meta = {}) => {
    debug(`[DB] ${message}`, meta);
};

module.exports = {
    log,
    error,
    warn,
    info,
    debug,
    server,
    email,
    queue,
    auth,
    db
};
