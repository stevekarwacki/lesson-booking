#!/bin/bash
# rollback.sh — Roll back to the previous release and restore the DB snapshot
#
# Usage:
#   bash scripts/rollback.sh              (uses last-good-release + latest backup)
#   bash scripts/rollback.sh <tag>        (target a specific release, e.g. v1.1.0)
#   npm run rollback
#
# WARNING: Restoring the database snapshot DISCARDS any data written after the
# deploy. This is intentional — maintenance mode freezes writes during the
# window, so data loss in normal operation is zero. If maintenance mode was
# bypassed, consult the backup file and restore manually to avoid losing data.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/pm2.sh"
source "$SCRIPT_DIR/lib/db-backup.sh"

# Override APP_ROOT for local/staging testing:
#   DEPLOY_APP_ROOT=/tmp/lb-test bash scripts/rollback.sh
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

# ────────────────────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────────────────────

main() {
    local target_release=""
    if [ $# -ge 1 ]; then
        target_release="$RELEASES_DIR/$1"
    fi

    log_info "=== Starting rollback ==="

    if [ ! -f "$ENV_FILE" ]; then
        log_error "Shared .env not found at $ENV_FILE"
        exit 1
    fi

    # Load env so DB_DIALECT, PORT, etc. are available
    set -a; source "$ENV_FILE"; set +a

    local health_url="http://localhost:${PORT:-3000}/api/public/health"

    # ── Resolve target release ─────────────────────────────────────────────
    if [ -z "$target_release" ]; then
        if [ -f "$LAST_GOOD_FILE" ]; then
            target_release=$(cat "$LAST_GOOD_FILE")
        else
            log_error "No previous release recorded in $LAST_GOOD_FILE."
            log_error "Specify a release explicitly: rollback <tag>"
            exit 1
        fi
    fi

    if [ ! -d "$target_release" ]; then
        log_error "Target release directory not found: $target_release"
        exit 1
    fi

    # ── Find matching DB backup ────────────────────────────────────────────
    # Derive the tag name from the release path to find the matching backup.
    local tag
    tag=$(basename "$target_release")
    # The backup for the _deployment to_ this release was labelled pre-<next-tag>.
    # For rollback, we want the snapshot taken just before the current (bad) deploy.
    local current_tag=""
    if [ -L "$CURRENT_LINK" ]; then
        current_tag=$(basename "$(readlink -f "$CURRENT_LINK")")
    fi

    local backup_file=""
    if [ -n "$current_tag" ]; then
        backup_file=$(db_latest_backup "$BACKUP_DIR" "pre-${current_tag}")
    fi
    # Fall back to the most recent backup of any kind
    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        backup_file=$(ls -t "$BACKUP_DIR"/* 2>/dev/null | head -n 1 || true)
    fi

    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        log_error "No database backup found in $BACKUP_DIR"
        log_error "Cannot safely roll back without a DB snapshot."
        log_error "If you still want to revert the symlink without touching the DB, use:"
        log_error "  ln -sfn $target_release $CURRENT_LINK && pm2 reload ecosystem.config.js"
        exit 1
    fi

    log_info "Will restore DB from: $backup_file"
    log_info "Will revert to release: $target_release"
    echo ""
    echo "  *** This will restore the database to its state at deploy time ***"
    echo "  *** Any data written after that point will be lost.            ***"
    echo ""
    read -rp "Proceed? [y/N] " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi

    # ── Maintenance ON ─────────────────────────────────────────────────────
    maintenance_on

    # Ensure maintenance is disabled even on unexpected exit
    trap 'maintenance_off; log_error "Rollback interrupted — maintenance mode may still be active"' ERR EXIT

    # ── Restore DB ────────────────────────────────────────────────────────
    db_restore "$backup_file"

    # ── Repoint symlink ───────────────────────────────────────────────────
    log_info "Reverting symlink to $target_release"
    ln -sfn "$target_release" "$CURRENT_LINK"

    # ── Reload PM2 ────────────────────────────────────────────────────────
    reload_app

    # ── Smoke test ────────────────────────────────────────────────────────
    smoke_test "$health_url"

    # ── Maintenance OFF ───────────────────────────────────────────────────
    trap - ERR EXIT
    maintenance_off

    log_success "=== Rollback to $target_release complete ==="
    echo ""
    echo "  Active release : $target_release"
    echo "  DB restored    : $backup_file"
    echo ""
}

main "$@"
