#!/bin/bash

# Common utility functions for installation scripts
# No decorations, just clean informational output

# Logging functions
log_info() {
    echo "[INFO] $1"
}

log_success() {
    echo "[OK] $1"
}

log_warn() {
    echo "[WARN] $1" >&2
}

log_error() {
    echo "[ERROR] $1" >&2
}

# Check if command exists
check_command() {
    command -v "$1" &> /dev/null
}

# Check Node.js version
check_node_version() {
    local required_version="$1"
    
    if ! check_command node; then
        log_error "Node.js is not installed"
        log_error "Please install Node.js ${required_version}.x or higher"
        return 1
    fi
    
    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt "$required_version" ]; then
        log_error "Node.js version ${required_version} or higher required"
        log_error "Current version: $(node -v)"
        return 1
    fi
    
    log_info "Node.js $(node -v) detected"
    return 0
}

# Check for .env file
check_env_file() {
    if [ -f .env ]; then
        log_info "Found .env configuration"
        return 0
    fi
    
    log_warn "No .env file found"
    if [ -f .env.example ]; then
        cp .env.example .env
        log_info "Created .env from .env.example"
        log_error "Please configure .env with your settings:"
        log_error "  - Database credentials (DB_USER, DB_PASSWORD, DB_NAME)"
        log_error "  - JWT_SECRET and ENCRYPTION_KEY"
        log_error "  - Stripe keys (if using payments)"
        echo ""
        log_error "Run: nano .env"
        return 1
    else
        log_error ".env.example not found"
        return 1
    fi
}

# Require script not run as root
require_not_root() {
    if [ "$EUID" -eq 0 ]; then
        log_error "Do not run this script as root"
        log_error "Run as a regular user. Sudo will be prompted when needed."
        exit 1
    fi
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/debian_version ]; then
            echo "debian"
        elif [ -f /etc/redhat-release ]; then
            echo "redhat"
        else
            echo "linux"
        fi
    else
        echo "unsupported"
    fi
}

# Get server IP address
get_server_ip() {
    curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}'
}

# Setup or check .env for development
setup_env_file() {
    if [ -f .env ]; then
        log_info "Found .env configuration"
        return 0
    fi
    
    if [ -f .env.example ]; then
        cp .env.example .env
        log_success "Created .env from .env.example"
        log_info "Review .env for any required changes"
    else
        log_warn ".env.example not found, skipping"
    fi
}
