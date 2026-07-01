#!/bin/bash
# Shared helpers for deploy.sh and rollback.sh.
# Source this file after SHARED_DIR has been defined by the caller.
#
# Functions here reference $SHARED_DIR at call time (not source time), so the
# caller can set/override it (e.g. via DEPLOY_APP_ROOT) before invoking them.

# Smoke-test window: SMOKE_RETRIES × SMOKE_INTERVAL seconds total.
# The health endpoint has a 3 s DB-ping timeout and curl uses --max-time 5,
# so each attempt is bounded. 20 × 5 = 100 s, a comfortable margin for app
# startup and DB reconnect. Override by exporting before sourcing.
SMOKE_RETRIES="${SMOKE_RETRIES:-20}"
SMOKE_INTERVAL="${SMOKE_INTERVAL:-5}"

# Enable maintenance mode. The Express middleware reads this flag file on every
# request, so the change is instant — no web server reload required.
maintenance_on() {
    touch "$SHARED_DIR/maintenance.flag"
    log_info "Maintenance mode ON"
}

# Disable maintenance mode.
maintenance_off() {
    rm -f "$SHARED_DIR/maintenance.flag"
    log_info "Maintenance mode OFF"
}

# smoke_test <url> — poll the health endpoint until it returns HTTP 200 or the
# retry window is exhausted. Returns 0 on success, 1 on failure.
smoke_test() {
    local url="$1"
    log_info "Smoke testing $url ..."
    local i=0
    while [ "$i" -lt "$SMOKE_RETRIES" ]; do
        local http_code
        # --max-time 5 bounds each attempt so a hung endpoint can't stall the
        # loop; the endpoint's own 3 s DB-ping timeout leaves a small buffer.
        http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
        if [ "$http_code" = "200" ]; then
            log_success "Health check passed (HTTP 200)"
            return 0
        fi
        i=$((i + 1))
        log_info "Attempt $i/$SMOKE_RETRIES: got HTTP $http_code, retrying in ${SMOKE_INTERVAL}s..."
        sleep "$SMOKE_INTERVAL"
    done
    log_error "Health check failed after $SMOKE_RETRIES attempts ($(( SMOKE_RETRIES * SMOKE_INTERVAL ))s total)"
    return 1
}
