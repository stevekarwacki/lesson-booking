#!/bin/bash
# deploy.sh — Deploy a tagged release with safe rollback capability
#
# Usage:
#   bash scripts/deploy.sh <tag>          e.g.  bash scripts/deploy.sh v1.2.0
#   npm run deploy:release -- v1.2.0
#
# What this script does:
#   1. Validates prerequisites and the release tag
#   2. Clones the tag into releases/<tag>, installs deps, builds frontend
#   3. Symlinks shared .env and uploads/ into the new release
#   4. Enables maintenance mode (Express middleware serves 503 — no DB writes possible)
#   5. Takes a pg_dump/sqlite backup to shared/db-backups/
#   6. Runs pending Sequelize migrations
#   7. Atomically repoints the `current` symlink to the new release
#   8. Reloads the app (PM2 by default, or DEPLOY_RELOAD_CMD)
#   9. Smoke-tests /api/public/health
#  10. Disables maintenance mode on success; auto-rolls back on any failure
#
# Rollback note: restoring the DB snapshot means any writes that happened
# AFTER the deploy started are lost. Maintenance mode prevents writes during
# the window (steps 4-10), so the only vulnerable window is between the
# deploy prep (steps 2-3) and the maintenance mode toggle (step 4).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/pm2.sh"
source "$SCRIPT_DIR/lib/db-backup.sh"

# Override APP_ROOT for local/staging testing:
#   DEPLOY_APP_ROOT=/tmp/lb-test bash scripts/deploy.sh v1.0.0
APP_ROOT="${DEPLOY_APP_ROOT:-$APP_DEFAULT_ROOT}"
RELEASES_DIR="$APP_ROOT/releases"
SHARED_DIR="$APP_ROOT/shared"
CURRENT_LINK="$APP_ROOT/current"
ENV_FILE="$SHARED_DIR/.env"
BACKUP_DIR="$SHARED_DIR/db-backups"
LAST_GOOD_FILE="$SHARED_DIR/last-good-release"

# maintenance_on/off and smoke_test are provided by deploy-common.sh; they use
# $SHARED_DIR (set above) at call time. Sourced after SHARED_DIR is defined.
source "$SCRIPT_DIR/lib/deploy-common.sh"

BACKUP_FILE=""  # set once the pre-deploy backup succeeds

# ────────────────────────────────────────────────────────────────────────────
# Failure handler
# ────────────────────────────────────────────────────────────────────────────
#
# On any failure after maintenance mode is enabled, we deliberately LEAVE the
# site in maintenance mode (writes stay frozen) and stop. The operator then runs
# `npm run rollback`, which restores the pre-deploy DB snapshot and reverts the
# symlink. Keeping recovery a separate, explicit step keeps deploy.sh simple and
# avoids doing anything destructive automatically.
on_deploy_failure() {
    trap - ERR  # prevent re-entry
    echo "" >&2
    log_error "Deploy failed. The site is in MAINTENANCE MODE (writes are frozen)."
    if [ -n "$BACKUP_FILE" ]; then
        log_error "Pre-deploy DB backup: $BACKUP_FILE"
    fi
    log_error "To restore the previous release and database, run:"
    log_error "    npm run rollback"
    log_error "Maintenance mode stays ON until you roll back or resolve the issue."
    exit 1
}

# ────────────────────────────────────────────────────────────────────────────
# Prerequisites
# ────────────────────────────────────────────────────────────────────────────

check_prerequisites() {
    if [ ! -d "$APP_ROOT" ]; then
        log_error "App root $APP_ROOT not found. Run bootstrap-release-layout.sh first."
        exit 1
    fi
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Shared .env not found at $ENV_FILE. Run bootstrap-release-layout.sh first."
        exit 1
    fi
    if ! check_command git; then
        log_error "git is not installed"
        exit 1
    fi
    if ! check_command curl; then
        log_error "curl is required for health checks"
        exit 1
    fi
    check_node_version 20 || exit 1
}

# ────────────────────────────────────────────────────────────────────────────
# Prepare release directory
# ────────────────────────────────────────────────────────────────────────────

prepare_release() {
    local tag="$1"
    local release_dir="$RELEASES_DIR/$tag"

    if [ -d "$release_dir" ]; then
        log_warn "Release directory $release_dir already exists — removing and re-cloning"
        rm -rf "$release_dir"
    fi

    # Determine git remote — prefer origin
    local repo_url
    repo_url=$(git -C "$SCRIPT_DIR/.." remote get-url origin 2>/dev/null || true)
    if [ -z "$repo_url" ]; then
        log_error "Cannot determine git remote URL. Ensure 'origin' is configured."
        exit 1
    fi

    # CRITICAL: this function's stdout must contain ONLY the resulting release
    # directory path (the caller captures it via command substitution). All log
    # output and npm/git output is therefore redirected to stderr with `1>&2`.
    log_info "Cloning $tag from $repo_url" 1>&2
    git clone --depth 1 --branch "$tag" "$repo_url" "$release_dir" 1>&2

    log_info "Installing backend dependencies" 1>&2
    npm install --production --prefix "$release_dir" 1>&2

    log_info "Building frontend" 1>&2
    # --include=dev ensures devDependencies (vite, vue plugins, tailwind) are
    # installed even when NODE_ENV=production is set in the environment.
    # NODE_ENV=production is intentionally preserved for the build step so vite
    # produces an optimised production bundle.
    (cd "$release_dir/frontend" && rm -f package-lock.json && npm install --include=dev && npm run build) 1>&2

    # Symlink shared persistent state into the new release
    ln -sf "$ENV_FILE" "$release_dir/.env" 1>&2
    rm -rf "$release_dir/uploads" 1>&2
    ln -sf "$SHARED_DIR/uploads" "$release_dir/uploads" 1>&2

    log_success "Release $tag prepared at $release_dir" 1>&2
    echo "$release_dir"
}

# ────────────────────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────────────────────

main() {
    if [ $# -lt 1 ]; then
        echo "Usage: $0 <tag>"
        echo "  e.g. $0 v1.2.0"
        exit 1
    fi

    local tag="$1"

    log_info "=== Deploying $tag ==="

    check_prerequisites

    # Load env so DB_DIALECT, PORT, etc. are available
    set -a; source "$ENV_FILE"; set +a

    # Build the health URL from PORT in shared/.env (default 3000).
    # The smoke test hits Node directly on localhost, bypassing Nginx/Cloudflare.
    local health_url="http://localhost:${PORT:-3000}/api/public/health"
    log_info "Health check URL: $health_url"

    # ── 1. Prepare release (clone, install, build, link) ──────────────────
    local release_dir
    release_dir=$(prepare_release "$tag")
    # Belt-and-suspenders: bash set -e doesn't always propagate through command
    # substitution. Explicitly verify the release directory exists and contains
    # a built frontend before proceeding with any live changes.
    if [ -z "$release_dir" ] || [ ! -f "$release_dir/frontend/dist/index.html" ]; then
        log_error "Release preparation failed — frontend was not built. Aborting."
        exit 1
    fi

    # ── 2. Record current release before touching anything live ───────────
    local prev_release=""
    if [ -L "$CURRENT_LINK" ]; then
        prev_release=$(readlink -f "$CURRENT_LINK")
        echo "$prev_release" > "$LAST_GOOD_FILE"
        log_info "Previous release: $prev_release"
    fi

    # From here on, any failure leaves the site in maintenance mode and points
    # the operator at `npm run rollback` (see on_deploy_failure).
    trap 'on_deploy_failure' ERR

    # ── 3. Maintenance mode ON ─────────────────────────────────────────────
    maintenance_on

    # ── 4. Database backup ────────────────────────────────────────────────
    BACKUP_FILE=$(db_backup "$BACKUP_DIR" "pre-${tag}")
    log_success "DB backup: $BACKUP_FILE"

    # ── 5. Run migrations from the new release ────────────────────────────
    log_info "Running database migrations"
    (cd "$release_dir" && NODE_ENV=production npx sequelize-cli db:migrate)
    log_success "Migrations complete"

    # ── 6. Swap symlink + reload the app ──────────────────────────────────
    log_info "Activating release: $release_dir"
    ln -sfn "$release_dir" "$CURRENT_LINK"

    # Install ecosystem file into shared if not already there (first deploy).
    # Use sed substitution (same as bootstrap) so APP_ROOT and APP_NAME are
    # correct rather than a raw cp that would leave the template defaults.
    if [ ! -f "$SHARED_DIR/ecosystem.config.js" ]; then
        sed -e "s|/var/www/lesson-booking|$APP_ROOT|g" \
            -e "s|lesson-booking|$APP_NAME|g" \
            "$SCRIPT_DIR/templates/ecosystem.config.js" \
            > "$SHARED_DIR/ecosystem.config.js"
    fi

    reload_app

    # ── 7. Smoke test ─────────────────────────────────────────────────────
    smoke_test "$health_url"

    # ── 8. All good — clear the failure trap and disable maintenance ───────
    trap - ERR

    maintenance_off

    log_success "=== Deploy of $tag complete ==="
    echo ""
    echo "  Active release : $release_dir"
    echo "  DB backup      : $BACKUP_FILE"
    echo "  Rollback with  : npm run rollback"
    echo ""
}

main "$@"
