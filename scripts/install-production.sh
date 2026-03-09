#!/bin/bash
set -e

# Production installer for Lesson Booking Application
# Installs and configures Nginx, PM2, and application

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/nginx.sh"
source "$SCRIPT_DIR/lib/pm2.sh"

APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check if frontend is built
check_frontend_build() {
    if [ -f "$APP_DIR/frontend/dist/index.html" ]; then
        log_info "Frontend build found"
        return 0
    fi
    
    log_warn "Frontend not built"
    if [ ! -d "$APP_DIR/frontend" ]; then
        log_error "Frontend directory not found"
        return 1
    fi
    
    log_info "Building frontend (this may take 2-5 minutes)..."
    cd "$APP_DIR/frontend"
    npm install
    npm run build
    cd "$APP_DIR"
    
    # Verify build succeeded
    if [ ! -f "$APP_DIR/frontend/dist/index.html" ]; then
        log_error "Frontend build failed - index.html not created"
        return 1
    fi
    
    log_success "Frontend built"
}

# Install backend dependencies
install_dependencies() {
    log_info "Installing backend dependencies..."
    cd "$APP_DIR"
    npm install --production
    log_success "Dependencies installed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    cd "$APP_DIR"
    npx sequelize-cli db:migrate
    log_success "Migrations completed"
}

# Setup firewall
setup_firewall() {
    if ! check_command ufw; then
        log_warn "UFW not installed, skipping firewall configuration"
        return 0
    fi
    
    log_info "Configuring firewall..."
    sudo ufw allow 'Nginx Full' 2>/dev/null || sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp 2>/dev/null
    sudo ufw allow OpenSSH 2>/dev/null || sudo ufw allow 22/tcp
    
    if ! sudo ufw status | grep -q "Status: active"; then
        echo "y" | sudo ufw enable >/dev/null 2>&1
    fi
    
    log_success "Firewall configured"
}

# Print summary
print_summary() {
    local server_ip=$(get_server_ip)
    
    echo ""
    log_success "Installation complete"
    echo ""
    echo "Application URL: http://$server_ip"
    echo ""
    echo "Management commands:"
    echo "  pm2 status              - Check status"
    echo "  pm2 logs lesson-booking - View logs"
    echo "  pm2 restart lesson-booking - Restart app"
    echo ""
    echo "Nginx commands:"
    echo "  sudo systemctl status nginx  - Check status"
    echo "  sudo systemctl restart nginx - Restart"
    echo "  sudo tail -f /var/log/nginx/lesson-booking-error.log"
    echo ""
    
    show_startup_reminder
    
    echo "Optional: Set up HTTPS with SSL"
    echo "  bash scripts/setup-ssl.sh yourdomain.com"
    echo ""
    echo "Default admin: admin@example.com / admin123"
    echo "Change password after first login!"
    echo ""
}

# Main installation flow
main() {
    log_info "Lesson Booking - Production Installer"
    
    # Validation phase
    require_not_root
    check_node_version 18 || exit 1
    
    cd "$APP_DIR"
    check_env_file || exit 1
    
    # Installation phase
    install_nginx
    install_pm2
    
    # Configuration phase
    configure_nginx
    setup_firewall
    
    # Deployment phase
    check_frontend_build || exit 1
    install_dependencies
    run_migrations
    start_app
    
    # Summary
    print_summary
}

main "$@"
