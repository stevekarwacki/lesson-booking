/**
 * Simple logger utility for the lesson booking application
 * Provides consistent logging across the application with environment-aware output
 */

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

class Logger {
    constructor() {
        // Set log level based on environment
        this.logLevel = this.getLogLevel();
        this.isProduction = process.env.NODE_ENV === 'production';
    }

    getLogLevel() {
        const envLevel = process.env.LOG_LEVEL?.toLowerCase();
        switch (envLevel) {
            case 'error': return LOG_LEVELS.ERROR;
            case 'warn': return LOG_LEVELS.WARN;
            case 'info': return LOG_LEVELS.INFO;
            case 'debug': return LOG_LEVELS.DEBUG;
            default: 
                // Default: INFO in production, DEBUG in development
                return process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
        }
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        
        if (this.isProduction) {
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
    }

    log(level, message, meta = {}) {
        const levelValue = LOG_LEVELS[level.toUpperCase()];
        
        if (levelValue <= this.logLevel) {
            const formattedMessage = this.formatMessage(level, message, meta);
            
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
    }

    error(message, meta = {}) {
        this.log('ERROR', message, meta);
    }

    warn(message, meta = {}) {
        this.log('WARN', message, meta);
    }

    info(message, meta = {}) {
        this.log('INFO', message, meta);
    }

    debug(message, meta = {}) {
        this.log('DEBUG', message, meta);
    }

    // Convenience methods for common use cases
    server(message, meta = {}) {
        this.info(`[SERVER] ${message}`, meta);
    }

    email(message, meta = {}) {
        this.info(`[EMAIL] ${message}`, meta);
    }

    queue(message, meta = {}) {
        this.debug(`[QUEUE] ${message}`, meta);
    }

    auth(message, meta = {}) {
        this.info(`[AUTH] ${message}`, meta);
    }

    db(message, meta = {}) {
        this.debug(`[DB] ${message}`, meta);
    }
}

// Export singleton instance
const logger = new Logger();

module.exports = logger;
