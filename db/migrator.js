const { spawn } = require('child_process');
const path = require('path');

/**
 * Automated database migration runner using existing sequelize-cli
 * This ensures all migrations run automatically on server startup
 * making deployments fully automated and replicable
 */
class DatabaseMigrator {
    constructor() {
        this.cliPath = path.resolve(__dirname, '../node_modules/.bin/sequelize-cli');
    }

    /**
     * Run all pending migrations using sequelize-cli
     * Safe to call multiple times - only runs new migrations
     */
    async runMigrations() {
        try {
            // Check for pending migrations
            const status = await this.getMigrationStatus();
            const pendingMigrations = status.filter(m => m.status === 'down');
            
            if (pendingMigrations.length === 0) {
                return; // Database is up to date
            }

            // Run pending migrations
            await this.executeCommand('db:migrate');

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get migration status
     */
    async getMigrationStatus() {
        try {
            const output = await this.executeCommand('db:migrate:status');
            return this.parseMigrationStatus(output);
        } catch (error) {
            return [];
        }
    }

    /**
     * Parse migration status output
     */
    parseMigrationStatus(output) {
        const lines = output.split('\n');
        const migrations = [];
        
        for (const line of lines) {
            if (line.includes('.js')) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2) {
                    migrations.push({
                        status: parts[0], // 'up' or 'down'
                        name: parts[1]
                    });
                }
            }
        }
        
        return migrations;
    }

    /**
     * Execute sequelize-cli command
     */
    executeCommand(command) {
        return new Promise((resolve, reject) => {
            const args = command.split(' ');
            const child = spawn('npx', ['sequelize-cli', ...args], {
                cwd: path.resolve(__dirname, '..'),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new Error(`Command failed with code ${code}: ${stderr}`));
                }
            });

            child.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Rollback the last migration (for development only)
     */
    async rollbackLast() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Rollback not allowed in production');
        }
        
        await this.executeCommand('db:migrate:undo');
    }
}

module.exports = DatabaseMigrator;
