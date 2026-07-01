#!/bin/bash
# Database backup/restore helpers — dialect dispatch
# Source this file; do not execute it directly.
#
# Supported dialects (DB_DIALECT):
#   postgres  — pg_dump / pg_restore        (tested, production-grade)
#   sqlite    — file copy                   (tested, development / small deployments)
#
# Adding another SQL engine is a small change: add a _backup_<engine> /
# _restore_<engine> pair (native dump/restore CLI) plus a case branch in
# db_backup / db_restore. The orchestration in deploy.sh / rollback.sh calls
# these functions generically and needs no changes.
#
# Environment variables read (sourced from shared/.env before these functions are called):
#   DB_DIALECT, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_STORAGE
#   DB_BACKUP_RETAIN  — total number of backups to keep in the dir (default 15)

DB_BACKUP_RETAIN="${DB_BACKUP_RETAIN:-15}"

# ────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ────────────────────────────────────────────────────────────────────────────

_require_binary() {
    local bin="$1"
    if ! command -v "$bin" &>/dev/null; then
        log_error "Required binary '$bin' not found."
        log_error "Install the appropriate client package for your database engine and try again."
        return 1
    fi
}

# Keep the N most recent backup files in the directory, regardless of label.
# Global (not per-label) so retention actually bounds disk usage across the
# many differently-tagged backups a real deploy history produces.
_prune_old_backups() {
    local backup_dir="$1"
    ls -t "${backup_dir}"/* 2>/dev/null \
        | tail -n "+$((DB_BACKUP_RETAIN + 1))" \
        | xargs -r rm -f --
}

# ────────────────────────────────────────────────────────────────────────────
# Postgres
# ────────────────────────────────────────────────────────────────────────────

_backup_postgres() {
    local out_file="$1"
    _require_binary pg_dump || return 1

    local host="${DB_HOST:-localhost}"
    local port="${DB_PORT:-5432}"
    local user="${DB_USER}"
    local dbname="${DB_NAME}"

    if [ -z "$user" ] || [ -z "$dbname" ]; then
        log_error "DB_USER and DB_NAME must be set for postgres backup."
        return 1
    fi

    log_info "Creating PostgreSQL backup -> $out_file"
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "$host" -p "$port" -U "$user" \
        -Fc --no-password \
        "$dbname" > "$out_file"
    log_success "PostgreSQL backup complete"
}

_restore_postgres() {
    local dump_file="$1"
    _require_binary pg_restore || return 1

    local host="${DB_HOST:-localhost}"
    local port="${DB_PORT:-5432}"
    local user="${DB_USER}"
    local dbname="${DB_NAME}"

    if [ -z "$user" ] || [ -z "$dbname" ]; then
        log_error "DB_USER and DB_NAME must be set for postgres restore."
        return 1
    fi

    log_info "Restoring PostgreSQL backup from $dump_file"
    PGPASSWORD="${DB_PASSWORD}" pg_restore \
        -h "$host" -p "$port" -U "$user" \
        --clean --if-exists --no-password \
        -d "$dbname" "$dump_file"
    log_success "PostgreSQL restore complete"
}

# ────────────────────────────────────────────────────────────────────────────
# SQLite
# ────────────────────────────────────────────────────────────────────────────

_backup_sqlite() {
    local out_file="$1"
    local src="${DB_STORAGE:-./db/database.sqlite}"

    if [ ! -f "$src" ]; then
        log_error "SQLite file not found: $src"
        return 1
    fi

    log_info "Creating SQLite backup -> $out_file"

    # Use sqlite3 online backup API if available; fall back to a plain copy.
    # The online backup method is WAL-safe (no torn reads).
    if command -v sqlite3 &>/dev/null; then
        sqlite3 "$src" ".backup '$out_file'"
    else
        cp "$src" "$out_file"
    fi

    log_success "SQLite backup complete"
}

_restore_sqlite() {
    local dump_file="$1"
    local target="${DB_STORAGE:-./db/database.sqlite}"

    log_info "Restoring SQLite backup from $dump_file -> $target"
    cp "$dump_file" "$target"
    log_success "SQLite restore complete"
}

# ────────────────────────────────────────────────────────────────────────────
# Public API
# ────────────────────────────────────────────────────────────────────────────

# db_backup <backup_dir> <label>
#   Creates a backup file in backup_dir named "<label>-<timestamp>.<ext>",
#   prints the absolute path to stdout, and prunes old backups.
db_backup() {
    local backup_dir="$1"
    local label="$2"
    local dialect="${DB_DIALECT:-sqlite}"
    local timestamp
    timestamp=$(date +%Y%m%d-%H%M%S)
    local out_file=""

    # CRITICAL: this function's stdout must contain ONLY the resulting file path
    # (callers capture it via command substitution). All progress logging and
    # backup work is therefore redirected to stderr with `1>&2`; the single
    # `echo "$out_file"` at the end is the only thing written to stdout.
    mkdir -p "$backup_dir" 1>&2
    chmod 700 "$backup_dir" 1>&2

    case "$dialect" in
        postgres|postgresql)
            out_file="${backup_dir}/${label}-${timestamp}.dump"
            _backup_postgres "$out_file" 1>&2 || return 1
            ;;
        sqlite|sqlite3)
            out_file="${backup_dir}/${label}-${timestamp}.sqlite"
            _backup_sqlite "$out_file" 1>&2 || return 1
            ;;
        *)
            log_error "Unsupported DB_DIALECT: '$dialect'. Supported: postgres, sqlite."
            return 1
            ;;
    esac

    _prune_old_backups "$backup_dir" 1>&2
    echo "$out_file"
}

# db_restore <dump_file>
#   Restores from the given dump file; dialect is inferred from DB_DIALECT.
db_restore() {
    local dump_file="$1"
    local dialect="${DB_DIALECT:-sqlite}"

    if [ ! -f "$dump_file" ]; then
        log_error "Backup file not found: $dump_file"
        return 1
    fi

    case "$dialect" in
        postgres|postgresql)
            _restore_postgres "$dump_file" || return 1
            ;;
        sqlite|sqlite3)
            _restore_sqlite "$dump_file" || return 1
            ;;
        *)
            log_error "Unsupported DB_DIALECT: '$dialect'. Supported: postgres, sqlite."
            return 1
            ;;
    esac
}

# db_latest_backup <backup_dir> <label_prefix>
#   Prints the path to the most recent backup matching the label prefix.
db_latest_backup() {
    local backup_dir="$1"
    local label_prefix="$2"
    ls -t "${backup_dir}/${label_prefix}"* 2>/dev/null | head -n 1
}
