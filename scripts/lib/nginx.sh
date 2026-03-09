#!/bin/bash

# Nginx installation and configuration functions
# Note: Assumes common.sh has already been sourced by parent script

# Install Nginx
install_nginx() {
    if check_command nginx; then
        log_info "Nginx already installed"
        return 0
    fi
    
    log_info "Installing Nginx..."
    sudo apt-get update -qq
    sudo apt-get install -y nginx >/dev/null 2>&1
    log_success "Nginx installed"
}

# Configure Nginx for application
configure_nginx() {
    local domain="${1:-_}"
    local port="${2:-3000}"
    local app_name="lesson-booking"
    local config_file="/etc/nginx/sites-available/$app_name"
    local template_file="$SCRIPT_DIR/templates/nginx-site.conf"
    
    log_info "Configuring Nginx..."
    
    # Check if config already exists
    if [ -f "$config_file" ]; then
        log_warn "Nginx configuration already exists"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipping Nginx configuration"
            return 0
        fi
    fi
    
    # Copy template and substitute values
    if [ -f "$template_file" ]; then
        sudo cp "$template_file" "$config_file"
        sudo sed -i "s/server_name _;/server_name $domain;/" "$config_file"
        sudo sed -i "s/localhost:3000/localhost:$port/" "$config_file"
    else
        log_error "Nginx template not found at $template_file"
        return 1
    fi
    
    # Enable site
    sudo ln -sf "$config_file" /etc/nginx/sites-enabled/
    
    # Disable default site if exists
    [ -f /etc/nginx/sites-enabled/default ] && sudo rm /etc/nginx/sites-enabled/default
    
    # Test configuration
    if test_nginx_config; then
        sudo systemctl restart nginx
        log_success "Nginx configured and restarted"
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
}

# Test Nginx configuration
test_nginx_config() {
    sudo nginx -t >/dev/null 2>&1
}

# Install certbot for SSL
install_certbot() {
    if check_command certbot; then
        log_info "Certbot already installed"
        return 0
    fi
    
    log_info "Installing Certbot..."
    sudo apt-get update -qq
    sudo apt-get install -y certbot python3-certbot-nginx >/dev/null 2>&1
    log_success "Certbot installed"
}

# Obtain SSL certificate
obtain_certificate() {
    local domain="$1"
    
    log_info "Obtaining SSL certificate for $domain..."
    
    # Try with auto email registration first
    if sudo certbot --nginx -d "$domain" --non-interactive --agree-tos --register-unsafely-without-email 2>/dev/null; then
        log_success "SSL certificate obtained"
        return 0
    fi
    
    # Fall back to interactive mode
    if sudo certbot --nginx -d "$domain"; then
        log_success "SSL certificate obtained"
        return 0
    else
        log_error "Failed to obtain SSL certificate"
        log_error "Check DNS configuration and firewall settings"
        return 1
    fi
}

# Test certificate renewal
test_renewal() {
    log_info "Testing certificate auto-renewal..."
    if sudo certbot renew --dry-run >/dev/null 2>&1; then
        log_success "Auto-renewal configured"
    else
        log_warn "Auto-renewal test failed (certificate will still work)"
    fi
}

# Verify DNS points to this server
verify_dns() {
    local domain="$1"
    local server_ip=$(get_server_ip)
    local domain_ip=$(dig +short "$domain" 2>/dev/null | tail -n1)
    
    if [ -z "$domain_ip" ]; then
        log_error "Cannot resolve domain $domain"
        log_error "Ensure DNS A record points to $server_ip"
        return 1
    fi
    
    if [ "$server_ip" != "$domain_ip" ]; then
        log_warn "DNS mismatch detected"
        log_warn "Server IP:  $server_ip"
        log_warn "Domain IP:  $domain_ip"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 1
        fi
    else
        log_info "DNS verified: $domain -> $server_ip"
    fi
}
