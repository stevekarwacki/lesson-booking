const { app } = require('./app');

const port = process.env.PORT || 3000;

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    const db = require('./db/index');

    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
}); 