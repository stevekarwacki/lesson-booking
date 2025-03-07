const db = require('../db/index');

const InstructorAvailability = {
    createAvailabilityTables: async () => {
        try {
            // Recreate with TIME type for more precise time storage
            await db.run(`
                CREATE TABLE IF NOT EXISTS instructor_weekly_availability (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    instructor_id INTEGER NOT NULL,
                    day_of_week INTEGER NOT NULL,
                    start_slot INTEGER NOT NULL,
                    duration INTEGER NOT NULL,
                    FOREIGN KEY (instructor_id) REFERENCES instructors(id)
                )
            `);
            console.log('Availability table created successfully');
        } catch (error) {
            console.error('Error creating availability table:', error);
            throw error;
        }
    },

    // Weekly schedule methods
    setWeeklyAvailability: (instructorId, slots) => {
        return new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Delete existing slots
                db.run(
                    'DELETE FROM instructor_weekly_availability WHERE instructor_id = ?',
                    [instructorId],
                    (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }

                        // Insert new slots
                        const stmt = db.prepare(
                            `INSERT INTO instructor_weekly_availability 
                            (instructor_id, day_of_week, start_slot, duration) 
                            VALUES (?, ?, ?, ?)`
                        );

                        let hasError = false;
                        slots.forEach(slot => {
                            stmt.run(
                                [instructorId, slot.dayOfWeek, slot.startSlot, slot.duration],
                                (err) => {
                                    if (err) hasError = err;
                                }
                            );
                        });

                        stmt.finalize((err) => {
                            if (err || hasError) {
                                db.run('ROLLBACK');
                                reject(err || hasError);
                                return;
                            }

                            db.run('COMMIT', (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            });
                        });
                    }
                );
            });
        });
    },

    getWeeklyAvailability: (instructorId) => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM instructor_weekly_availability 
                WHERE instructor_id = ? 
                ORDER BY day_of_week, start_slot`,
                [instructorId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
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
};

module.exports = InstructorAvailability; 