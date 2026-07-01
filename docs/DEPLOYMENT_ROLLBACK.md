# Deployment & Rollback Guide

This document describes the **releases/symlink deployment strategy** for the Lesson Booking application on a DigitalOcean Droplet (or any Linux server running Nginx + PM2).

## Overview

Rather than deploying directly into a single folder, each release gets its own directory. A `current` symlink points to the active release. Rolling back is an instant symlink swap, and a pre-deploy database snapshot makes schema changes safely reversible.

```
/var/www/lesson-booking/
  releases/
    v1.0.0/              # each tag = one directory; never modified after deploy
    v1.0.1/
  shared/
    .env                 # single config file — all releases share this
    uploads/             # local file storage — persists across releases
    db-backups/          # pg_dump / sqlite snapshots
    ecosystem.config.js  # PM2 config — script path points through `current`
    maintenance.flag     # presence triggers Nginx 503 maintenance page
    maintenance.html     # static page served during maintenance window
    logs/                # PM2 log files
    last-good-release    # records the previous release path for auto-rollback
  current -> releases/v1.0.1   # active symlink
```

## Prerequisites

| Requirement | Install |
|---|---|
| Node.js ≥ 18 | `nvm install 18` or system package |
| PM2 | `sudo npm install -g pm2` |
| Nginx | `sudo apt install nginx` |
| Git | `sudo apt install git` |
| curl | `sudo apt install curl` |
| **PostgreSQL client** | `sudo apt install postgresql-client` |

> The PostgreSQL *server* must be installed separately and running locally.  
> See the [Installation Guide](INSTALLATION_GUIDE.md) for initial server setup.

## Where the scripts run from

The `deploy.sh` and `rollback.sh` scripts run from a **persistent git checkout** of this repository on the server — this is separate from the `releases/` directories they create. Clone it once to a stable location (e.g. your home directory) and always run deploys from there:

```bash
git clone <repository-url> ~/lesson-booking-deploy
cd ~/lesson-booking-deploy
git fetch --tags   # before each deploy, to pull new tags
```

`deploy.sh` reads the `origin` remote of this checkout to clone the requested tag into `releases/<tag>`. For a **private repository**, ensure this checkout has working credentials (an SSH deploy key or a cached HTTPS token) so the clone step can authenticate non-interactively.

## First-time Setup

Run the bootstrap script **once** on a new server, from the persistent checkout above. It creates the directory layout, copies config templates, and configures Nginx.

```bash
# From the repo root (not as root)
bash scripts/bootstrap-release-layout.sh
```

Then edit the shared config before your first deploy:

```bash
nano /var/www/lesson-booking/shared/.env
```

Mandatory settings in `shared/.env`:

```env
NODE_ENV=production
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=youruser
DB_PASSWORD=yourpassword
DB_NAME=lesson_booking

JWT_SECRET=<random 64-char string>
ENCRYPTION_KEY=<random 32-byte hex>

STORAGE_LOCAL_PATH=/var/www/lesson-booking/shared/uploads
```

## Deploying a New Release

### 1. Tag the stable commit

```bash
git tag -a v1.2.0 -m "Description of release"
git push origin --tags
```

### 2. Run the deploy script on the server

```bash
bash scripts/deploy.sh v1.2.0
# or
npm run deploy:release -- v1.2.0
```

**What happens automatically:**

1. Git clones the tag into `releases/v1.2.0`
2. `npm install --production` + frontend build run inside the new release
3. `shared/.env` and `shared/uploads` are symlinked in
4. **Maintenance mode turns ON** — the Express app returns 503; no DB writes can reach the app
5. A `pg_dump` snapshot is written to `shared/db-backups/pre-v1.2.0-<timestamp>.dump`
6. Sequelize migrations run from the new release directory
7. The `current` symlink is atomically repointed to `releases/v1.2.0`
8. The app reloads via PM2 `ecosystem.config.js` (near-zero downtime)
9. `GET /api/public/health` is polled until HTTP 200 (up to ~100 s)
10. **Maintenance mode turns OFF** — site is live

If any step fails, the script **leaves the site in maintenance mode** (writes stay frozen) and stops, telling you to run `npm run rollback`. Recovery is a deliberate, separate step rather than an automatic action — see [Rolling Back](#rolling-back).

## Rolling Back

```bash
bash scripts/rollback.sh
# or
npm run rollback
```

To roll back to a specific version:

```bash
bash scripts/rollback.sh v1.1.0
```

**What happens:**

1. The script locates the DB backup taken just before the (bad) deploy
2. Asks for confirmation (restoring the backup discards writes made after deploy)
3. **Maintenance mode turns ON**
4. Database is restored from the snapshot
5. The `current` symlink reverts to the previous release
6. The app reloads
7. Health check passes
8. **Maintenance mode turns OFF**

> **Data loss caveat:** Restoring the backup discards data written to the database *after* the deploy started. Maintenance mode prevents any writes during the deploy/rollback window, so data loss is zero under normal operation. If maintenance mode was bypassed or the window was very long, consult the backup file and restore manually.

## Manual Maintenance Mode

Maintenance mode is handled inside the Express app (`middleware/maintenance.js`), not Nginx. The app reads the flag file on every request, so toggling is instant — no web server reload needed. This means maintenance mode works regardless of your reverse proxy (Nginx, Caddy, Cloudflare Tunnel, or none).

```bash
# Turn ON
npm run maintenance:on
# or manually:
touch /var/www/lesson-booking/shared/maintenance.flag

# Turn OFF
npm run maintenance:off
# or manually:
rm /var/www/lesson-booking/shared/maintenance.flag
```

The `/api/public/health` endpoint is always exempted from maintenance mode so deploy/rollback smoke tests can still verify the app is up.

## Database Backups

Backups are stored in `shared/db-backups/`. The deploy script retains the 15 most recent backups in that directory and prunes older ones (configurable via `DB_BACKUP_RETAIN` in `.env`).

### Manual backup

```bash
# Source the helpers and env first
source scripts/lib/common.sh
source scripts/lib/db-backup.sh
set -a; source /var/www/lesson-booking/shared/.env; set +a

backup_file=$(db_backup /var/www/lesson-booking/shared/db-backups manual)
echo "Backup: $backup_file"
```

### Manual restore

```bash
# Source helpers and env (as above), then:
db_restore /var/www/lesson-booking/shared/db-backups/pre-v1.2.0-20260629-120000.dump
```

### Restore with psql directly (Postgres)

```bash
PGPASSWORD=yourpassword pg_restore \
  -h localhost -U youruser \
  --clean --if-exists \
  -d lesson_booking \
  /var/www/lesson-booking/shared/db-backups/pre-v1.2.0-20260629-120000.dump
```

## Using a Different Process Manager

By default the deploy/rollback scripts use PM2. To use a different process manager, set `DEPLOY_RELOAD_CMD` in `shared/.env`:

```env
# systemd
DEPLOY_RELOAD_CMD=sudo systemctl restart lesson-booking

# Docker
DEPLOY_RELOAD_CMD=docker restart lesson-booking

# supervisord
DEPLOY_RELOAD_CMD=supervisorctl restart lesson-booking
```

## Using a Different (or No) Reverse Proxy

Nginx is optional. The maintenance mode and health check both live inside the Express app, so they work with any of these setups:

| Setup | Notes |
|---|---|
| **Nginx** (default) | Use `scripts/templates/nginx-site.conf` as a starting point |
| **Caddy** | `reverse_proxy localhost:3000` — no other config needed for maintenance mode |
| **Cloudflare Tunnel** | Install `cloudflared`, point tunnel to `localhost:3000` — no Nginx needed at all |
| **No reverse proxy** | Expose Node directly on port 80/443 (not recommended for production) |

If you do use Nginx, it's now a plain reverse proxy — no maintenance-mode logic lives there.

## Multi-Database Support

| Dialect | Status | Client required |
|---|---|---|
| `postgres` | Supported, tested | `postgresql-client` |
| `sqlite` | Supported, tested | none (file copy) |

Backup/restore is handled by a small dialect dispatch in `scripts/lib/db-backup.sh`. Adding another SQL engine (e.g. MySQL/MariaDB) is a self-contained change — add a `_backup_<engine>` / `_restore_<engine>` pair using that engine's native dump/restore CLI, plus a `case` branch in `db_backup`/`db_restore`. The deploy/rollback orchestration calls these generically and needs no changes.

## Useful Commands

```bash
# Check PM2 status
pm2 status

# View live app logs
pm2 logs lesson-booking

# View Nginx logs
sudo tail -f /var/log/nginx/lesson-booking-error.log

# List releases
ls -la /var/www/lesson-booking/releases/

# See which release is active
readlink /var/www/lesson-booking/current

# List backups
ls -lht /var/www/lesson-booking/shared/db-backups/
```

## Upgrading from a Single-Folder Install

If you have an existing single-folder production install, upgrade by:

1. Taking a manual backup of your database
2. Running `bash scripts/bootstrap-release-layout.sh`
3. Copying your existing `.env` to `shared/.env` and adding `STORAGE_LOCAL_PATH`
4. Tagging the current commit and running `bash scripts/deploy.sh <tag>`

The `install-production.sh` script detects the new layout and redirects you to `deploy.sh` automatically.
