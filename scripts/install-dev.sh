#!/bin/bash
set -e

# Development setup for Lesson Booking Application
# No system modifications required

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Install all dependencies
install_dependencies_dev() {
    log_info "Installing backend dependencies..."
    cd "$APP_DIR"
    npm install >/dev/null 2>&1
    
    log_info "Installing frontend dependencies..."
    cd "$APP_DIR/frontend"
    npm install >/dev/null 2>&1
    
    cd "$APP_DIR"
    log_success "Dependencies installed"
}

# Main setup flow
main() {
    log_info "Lesson Booking - Development Setup"
    
    check_node_version 18 || exit 1
    
    cd "$APP_DIR"
    setup_env_file
    install_dependencies_dev
    
    echo ""
    log_success "Setup complete"
    echo ""
    echo "Start development servers:"
    echo "  Terminal 1: npm run dev"
    echo "  Terminal 2: cd frontend && npm run dev"
    echo ""
    echo "Access: http://localhost:5173"
    echo ""
}

main "$@"
