const db = require('../db/index');

const InstructorAvailability = {
    createAvailabilityTables: async () => {
        try {
            // Recreate with TIME type for more precise time storage
            await db.run(`
                CREATE TABLE IF NOT EXISTS instructor_weekly_availability (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    instructor_id INTEGER NOT NULL,
                    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE
                )
            `);
    
            // Time blocks where instructor is unavailable (overrides weekly schedule)
            await db.run(`
                CREATE TABLE IF NOT EXISTS instructor_blocked_times (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    instructor_id INTEGER NOT NULL,
                    start_datetime DATETIME NOT NULL,
                    end_datetime DATETIME NOT NULL,
                    reason TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE
                )
            `);
    
            console.log('Availability tables created successfully');
        } catch (error) {
            console.error('Error creating availability tables:', error);
            throw error;
        }
    },

    // Weekly schedule methods
    setWeeklyAvailability: (instructorId, schedules) => {
        return new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION', async (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                try {
                    await new Promise((resolve, reject) => {
                        db.run(
                            'DELETE FROM instructor_weekly_availability WHERE instructor_id = ?',
                            [instructorId],
                            (err) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });

                    for (const schedule of schedules) {
                        await new Promise((resolve, reject) => {
                            db.run(
                                `INSERT INTO instructor_weekly_availability 
                                (instructor_id, day_of_week, start_time, end_time)
                                VALUES (?, ?, ?, ?)`,
                                [instructorId, schedule.day_of_week, schedule.start_time, schedule.end_time],
                                (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                }
                            );
                        });
                    }

                    await new Promise((resolve, reject) => {
                        db.run('COMMIT', (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });

                    resolve();
                } catch (error) {
                    await new Promise((resolve) => {
                        db.run('ROLLBACK', (err) => {
                            if (err) console.error('Rollback error:', err);
                            resolve();
                        });
                    });
                    reject(error);
                }
            });
        });
    },

    getWeeklyAvailability: (instructorId) => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM instructor_weekly_availability 
                WHERE instructor_id = ?
                ORDER BY day_of_week, start_time
            `;
            
            db.all(query, [instructorId], (err, rows) => {
                if (err) reject(err);
                resolve(rows || []);
            });
        });
    },

    // Blocked times methods
    addBlockedTime: (instructorId, blockedTime) => {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO instructor_blocked_times 
                (instructor_id, start_datetime, end_datetime, reason)
                VALUES (?, ?, ?, ?)`,
                [
                    instructorId, 
                    blockedTime.startDateTime, 
                    blockedTime.endDateTime, 
                    blockedTime.reason
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    },

    removeBlockedTime: (id) => {
        return new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM instructor_blocked_times WHERE id = ?',
                [id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    getBlockedTimes: (instructorId, startDate, endDate) => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM instructor_blocked_times 
                WHERE instructor_id = ? 
                AND start_datetime <= ? 
                AND end_datetime >= ?
                ORDER BY start_datetime`,
                [instructorId, endDate, startDate],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }
};

module.exports = InstructorAvailability; 