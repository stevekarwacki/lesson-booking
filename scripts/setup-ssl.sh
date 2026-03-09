#!/bin/bash
set -e

# SSL/HTTPS setup for Lesson Booking Application
# Uses Let's Encrypt via Certbot

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/nginx.sh"

APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Update Nginx configuration with domain
update_nginx_domain() {
    local domain="$1"
    local config_file="/etc/nginx/sites-available/lesson-booking"
    
    if [ ! -f "$config_file" ]; then
        log_error "Nginx configuration not found"
        log_error "Run installation script first: bash scripts/install-production.sh"
        return 1
    fi
    
    log_info "Updating Nginx configuration..."
    sudo sed -i "s/server_name _;/server_name $domain;/" "$config_file"
    
    if test_nginx_config; then
        sudo systemctl reload nginx
        log_success "Nginx configuration updated"
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
}

# Print summary
print_summary() {
    local domain="$1"
    
    echo ""
    log_success "SSL setup complete"
    echo ""
    echo "Your application: https://$domain"
    echo ""
    echo "Certificate management:"
    echo "  sudo certbot certificates    - List certificates"
    echo "  sudo certbot renew           - Manually renew"
    echo ""
    echo "Certificate auto-renewal is enabled"
    echo ""
}

# Main SSL setup flow
main() {
    local domain="$1"
    
    if [ -z "$domain" ]; then
        log_error "Domain name required"
        echo ""
        echo "Usage: $0 DOMAIN"
        echo "Example: $0 lessons.example.com"
        exit 1
    fi
    
    log_info "Setting up SSL for $domain"
    
    # Validation
    require_not_root
    
    if ! check_command nginx; then
        log_error "Nginx not installed"
        log_error "Run installation script first: bash scripts/install-production.sh"
        exit 1
    fi
    
    # DNS verification
    verify_dns "$domain" || exit 1
    
    # SSL setup
    update_nginx_domain "$domain" || exit 1
    install_certbot
    obtain_certificate "$domain" || exit 1
    test_renewal
    
    # Summary
    print_summary "$domain"
}

main "$@"
