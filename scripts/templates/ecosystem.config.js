// PM2 ecosystem config — lives in shared/ on the server.
// The script path goes through the `current` symlink so that
// `pm2 reload` picks up the newly active release without a full restart.

const APP_ROOT = '/var/www/lesson-booking';

module.exports = {
    apps: [
        {
            name: 'lesson-booking',
            script: `${APP_ROOT}/current/server.js`,
            cwd: `${APP_ROOT}/current`,
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            env: {
                NODE_ENV: 'production',
            },
            // wait_ready: true tells PM2 to wait for process.send('ready') before
            // considering the reload complete. server.js emits this after the HTTP
            // port is bound and all services are initialized. listen_timeout is the
            // fallback ceiling if the signal is never emitted.
            wait_ready: true,
            listen_timeout: 30000,
            kill_timeout: 5000,
            // Log rotation — requires pm2-logrotate module
            out_file: `${APP_ROOT}/shared/logs/app-out.log`,
            error_file: `${APP_ROOT}/shared/logs/app-error.log`,
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },
    ],
};
