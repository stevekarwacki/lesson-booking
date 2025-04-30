const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../db/database.sqlite'),
    logging: false
});

async function runMigrations() {
    try {
        // Get all migration files except run.js
        const migrationFiles = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.js') && file !== 'run.js')
            .sort();

        console.log('Running migrations...');
        
        for (const file of migrationFiles) {
            console.log(`Running migration: ${file}`);
            const migration = require(path.join(__dirname, file));
            await migration.up(sequelize.getQueryInterface(), Sequelize);
            console.log(`Completed migration: ${file}`);
        }

        console.log('All migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigrations(); 