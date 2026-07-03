#!/bin/bash
# bootstrap-release-layout.sh
#
# Run this ONCE on a fresh DigitalOcean droplet (or any new server) to set up
# the releases/symlink directory structure before the first deploy.
#
# It is safe to re-run — it skips steps that are already done.
#
# Usage:
#   bash scripts/bootstrap-release-layout.sh
#   bash scripts/bootstrap-release-layout.sh --app-root /custom/path
#
# After running this script:
#   1. Edit $APP_DEFAULT_ROOT/shared/.env with your production settings
#   2. Copy ecosystem.config.js to shared/ (done automatically)
#   3. Copy maintenance.html to shared/ (done automatically)
#   4. Run: bash scripts/deploy.sh <tag>  to deploy the first release

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

# Default: $APP_DEFAULT_ROOT (defined in common.sh as /var/www/$APP_NAME)
# Override with --app-root flag or DEPLOY_APP_ROOT env var for local testing:
#   DEPLOY_APP_ROOT=/tmp/lb-test bash scripts/bootstrap-release-layout.sh
APP_ROOT="${DEPLOY_APP_ROOT:-$APP_DEFAULT_ROOT}"

# Parse optional --app-root flag (takes precedence over env var)
while [[ $# -gt 0 ]]; do
    case $1 in
        --app-root)
            APP_ROOT="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

SHARED_DIR="$APP_ROOT/shared"
RELEASES_DIR="$APP_ROOT/releases"

log_info "Bootstrapping release layout at $APP_ROOT"

# ── Create directory structure ─────────────────────────────────────────────
mkdir -p \
    "$RELEASES_DIR" \
    "$SHARED_DIR/uploads" \
    "$SHARED_DIR/db-backups" \
    "$SHARED_DIR/logs"

chmod 700 "$SHARED_DIR/db-backups"
chmod 750 "$SHARED_DIR/uploads"

log_success "Directory structure created"

# ── Shared .env ────────────────────────────────────────────────────────────
# SOURCE_ENV: path to an existing .env to seed shared/.env from (e.g. the
# current flat-install .env when migrating a server). When not set, the script
# looks for a real .env next to itself; only if that is absent does it fall back
# to .env.example. This prevents deploying with SQLite template defaults on a
# server that already has real credentials configured.
#   e.g.: SOURCE_ENV=/home/lesson-booking/.env bash scripts/bootstrap-release-layout.sh
SOURCE_ENV="${SOURCE_ENV:-$SCRIPT_DIR/../.env}"

if [ ! -f "$SHARED_DIR/.env" ]; then
    if [ -f "$SOURCE_ENV" ] && [ "$SOURCE_ENV" != "$SCRIPT_DIR/../.env.example" ]; then
        cp "$SOURCE_ENV" "$SHARED_DIR/.env"
        log_success "Seeded shared/.env from $SOURCE_ENV"
        log_warn "Review $SHARED_DIR/.env and add/update:"
        log_warn "  STORAGE_LOCAL_PATH=$SHARED_DIR/uploads"
    elif [ -f "$SCRIPT_DIR/../.env.example" ]; then
        cp "$SCRIPT_DIR/../.env.example" "$SHARED_DIR/.env"
        log_warn "No existing .env found — copied .env.example to shared/.env"
        log_warn "You MUST edit $SHARED_DIR/.env before deploying:"
        log_warn "  NODE_ENV=production"
        log_warn "  DB_DIALECT, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
        log_warn "  JWT_SECRET, ENCRYPTION_KEY"
        log_warn "  STORAGE_LOCAL_PATH=$SHARED_DIR/uploads"
    else
        touch "$SHARED_DIR/.env"
        log_warn "No .env or .env.example found — created empty $SHARED_DIR/.env. Populate it before deploying."
    fi
else
    log_info "shared/.env already exists — skipping"
fi
chmod 600 "$SHARED_DIR/.env"

# ── PM2 ecosystem file ─────────────────────────────────────────────────────
if [ ! -f "$SHARED_DIR/ecosystem.config.js" ]; then
    if [ -f "$SCRIPT_DIR/templates/ecosystem.config.js" ]; then
        # Substitute both the default path and app name placeholders in the template.
        # Path substitution runs first so the app-name pass doesn't double-process it.
        sed -e "s|/var/www/lesson-booking|$APP_ROOT|g" \
            -e "s|lesson-booking|$APP_NAME|g" \
            "$SCRIPT_DIR/templates/ecosystem.config.js" \
            > "$SHARED_DIR/ecosystem.config.js"
        log_success "ecosystem.config.js installed"
    else
        log_warn "templates/ecosystem.config.js not found — skipping"
    fi
else
    log_info "ecosystem.config.js already exists — skipping"
fi

# ── Maintenance page ───────────────────────────────────────────────────────
if [ ! -f "$SHARED_DIR/maintenance.html" ]; then
    if [ -f "$SCRIPT_DIR/templates/maintenance.html" ]; then
        cp "$SCRIPT_DIR/templates/maintenance.html" "$SHARED_DIR/maintenance.html"
        log_success "maintenance.html installed"
    else
        log_warn "templates/maintenance.html not found — skipping"
    fi
else
    log_info "maintenance.html already exists — skipping"
fi

# ── Nginx config ───────────────────────────────────────────────────────────
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
if [ ! -f "$NGINX_CONF" ]; then
    if [ -f "$SCRIPT_DIR/templates/nginx-site.conf" ]; then
        # Substitute path and app name placeholders (no-op when using defaults).
        sudo sh -c "sed -e 's|/var/www/lesson-booking|$APP_ROOT|g' \
            -e 's|lesson-booking|$APP_NAME|g' \
            '$SCRIPT_DIR/templates/nginx-site.conf' > '$NGINX_CONF'"
        sudo ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/$APP_NAME" 2>/dev/null || true
        sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
        sudo nginx -t && sudo nginx -s reload
        log_success "Nginx configured as reverse proxy"
    else
        log_warn "templates/nginx-site.conf not found — configure Nginx manually"
    fi
else
    log_info "Nginx site config already exists at $NGINX_CONF"
    log_info "If you need to update it with maintenance-mode support, replace it manually."
fi

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
log_success "Bootstrap complete"
echo ""
echo "Next steps:"
echo "  1. Edit $SHARED_DIR/.env with your production configuration"
echo "  2. Tag a stable release:  git tag -a v1.0.0 -m 'Initial release' && git push --tags"
echo "  3. Deploy:                bash scripts/deploy.sh v1.0.0"
echo ""
echo "Maintenance toggle (when needed — handled by the Express app, no reload):"
echo "  ON  : touch $SHARED_DIR/maintenance.flag"
echo "  OFF : rm $SHARED_DIR/maintenance.flag"
echo ""
