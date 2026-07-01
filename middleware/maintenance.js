const fs = require('fs');
const path = require('path');

// Resolve the maintenance flag file path.
// Priority: MAINTENANCE_FLAG env var > shared/ sibling to cwd > default /var/www path.
function resolveFlagPath() {
    if (process.env.MAINTENANCE_FLAG) {
        return process.env.MAINTENANCE_FLAG;
    }
    // When running from a releases/current symlink the shared/ dir is one level up.
    const sharedSibling = path.resolve(process.cwd(), '../shared/maintenance.flag');
    if (fs.existsSync(path.dirname(sharedSibling))) {
        return sharedSibling;
    }
    return '/var/www/lesson-booking/shared/maintenance.flag';
}

const FLAG_PATH = resolveFlagPath();

// Read the maintenance page HTML once; fall back to a plain text response.
function loadMaintenancePage() {
    const htmlPath = path.resolve(path.dirname(FLAG_PATH), 'maintenance.html');
    try {
        return fs.readFileSync(htmlPath, 'utf8');
    } catch {
        return null;
    }
}

/**
 * Express middleware that returns 503 for all non-health-check requests when
 * the maintenance flag file is present.
 *
 * This approach is web-server-agnostic: it works with Nginx, Caddy,
 * Cloudflare Tunnel, or no reverse proxy at all.
 *
 * The /api/public/health route is intentionally exempted so deploy/rollback
 * smoke tests can still verify the app came up after the PM2 reload.
 */
function maintenanceMiddleware(req, res, next) {
    // Always let the health check through — smoke tests need it.
    if (req.path === '/api/public/health') {
        return next();
    }

    try {
        if (fs.existsSync(FLAG_PATH)) {
            const html = loadMaintenancePage();
            res.status(503);
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Retry-After', '60');
            if (html) {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(html);
            }
            return res.json({ status: 'maintenance', message: 'Temporarily unavailable for scheduled maintenance.' });
        }
    } catch {
        // If the flag check itself throws (e.g. permissions), let traffic through.
    }

    next();
}

module.exports = { maintenanceMiddleware, FLAG_PATH };
