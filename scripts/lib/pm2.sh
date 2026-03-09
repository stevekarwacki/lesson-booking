#!/bin/bash

# PM2 process manager functions
# Note: Assumes common.sh has already been sourced by parent script

APP_NAME="lesson-booking"

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
