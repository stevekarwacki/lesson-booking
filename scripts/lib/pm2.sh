#!/bin/bash

# PM2 process manager functions
# Note: Assumes common.sh has already been sourced by parent script

APP_NAME="lesson-booking"
# Base shared dir on DEPLOY_APP_ROOT so local/staging testing works; deploy.sh
# and rollback.sh reassign SHARED_DIR after sourcing, and reload_app recomputes
# the ecosystem path from SHARED_DIR at call time (see reload_app below).
SHARED_DIR="${DEPLOY_APP_ROOT:-/var/www/lesson-booking}/shared"

# Install PM2
install_pm2() {
    if check_command pm2; then
        log_info "PM2 already installed"
        return 0
    fi
    
    log_info "Installing PM2..."
    sudo npm install -g pm2 >/dev/null 2>&1
    
    # PM2 installs to /usr/local/bin with sudo npm install -g
    # Make sure it's in PATH
    export PATH="/usr/local/bin:$PATH"
    hash -r
    
    # Give the filesystem a moment to sync
    sleep 1
    
    # Verify pm2 is now accessible
    if [ -f /usr/local/bin/pm2 ]; then
        log_success "PM2 installed at /usr/local/bin/pm2"
    elif check_command pm2; then
        log_success "PM2 installed at $(which pm2)"
    else
        log_error "PM2 installation failed"
        log_error "Try manually: sudo npm install -g pm2"
        return 1
    fi
}

# Start application with PM2
start_app() {
    local script="${1:-server.js}"
    
    # Ensure /usr/local/bin is in PATH
    export PATH="/usr/local/bin:$PATH"
    
    # Verify pm2 is accessible
    if ! check_command pm2 && [ ! -f /usr/local/bin/pm2 ]; then
        log_error "PM2 not found"
        return 1
    fi
    
    # Use full path if command isn't in PATH
    local pm2_cmd="pm2"
    if ! check_command pm2 && [ -f /usr/local/bin/pm2 ]; then
        pm2_cmd="/usr/local/bin/pm2"
    fi
    
    # Stop if already running
    if $pm2_cmd list 2>/dev/null | grep -q "$APP_NAME"; then
        log_info "Stopping existing application..."
        $pm2_cmd stop "$APP_NAME" >/dev/null 2>&1
        $pm2_cmd delete "$APP_NAME" >/dev/null 2>&1
    fi
    
    log_info "Starting application..."
    if $pm2_cmd start "$script" --name "$APP_NAME" >/dev/null 2>&1; then
        $pm2_cmd save >/dev/null 2>&1
        log_success "Application started"
    else
        log_error "Failed to start application"
        log_error "Check logs with: pm2 logs $APP_NAME"
        return 1
    fi
}

# Reload application after a symlink swap.
#
# By default uses PM2 + ecosystem.config.js for near-zero-downtime reload.
# To use a different process manager, set DEPLOY_RELOAD_CMD in your environment:
#
#   DEPLOY_RELOAD_CMD="sudo systemctl restart lesson-booking"
#   DEPLOY_RELOAD_CMD="docker restart lesson-booking"
#   DEPLOY_RELOAD_CMD="supervisorctl restart lesson-booking"
#
# The command is run as-is; it is your responsibility to ensure it reloads
# the process pointing at the updated `current` symlink.
reload_app() {
    if [ -n "${DEPLOY_RELOAD_CMD:-}" ]; then
        log_info "Reloading application via DEPLOY_RELOAD_CMD: $DEPLOY_RELOAD_CMD"
        eval "$DEPLOY_RELOAD_CMD"
        log_success "Application reloaded"
        return 0
    fi

    # Recompute from the current SHARED_DIR so DEPLOY_APP_ROOT overrides are honored.
    local ecosystem_file="${SHARED_DIR}/ecosystem.config.js"

    export PATH="/usr/local/bin:$PATH"
    local pm2_cmd="pm2"
    [ ! -f /usr/local/bin/pm2 ] || pm2_cmd="/usr/local/bin/pm2"

    if [ -f "$ecosystem_file" ]; then
        log_info "Reloading application via ecosystem file..."
        if $pm2_cmd startOrReload "$ecosystem_file" --update-env >/dev/null 2>&1; then
            $pm2_cmd save >/dev/null 2>&1
            log_success "Application reloaded"
            return 0
        else
            log_warn "startOrReload failed, falling back to restart"
        fi
    fi

    restart_app
}

# Restart application
restart_app() {
    if is_app_running; then
        log_info "Restarting application..."
        pm2 restart "$APP_NAME" >/dev/null 2>&1
        log_success "Application restarted"
    else
        start_app
    fi
}

# Check if app is running
is_app_running() {
    pm2 list 2>/dev/null | grep -q "$APP_NAME"
}

# Show startup command reminder
show_startup_reminder() {
    echo ""
    log_info "To enable auto-start on system reboot:"
    echo "  1. Run: pm2 startup"
    echo "  2. Execute the command it displays"
    echo ""
}
