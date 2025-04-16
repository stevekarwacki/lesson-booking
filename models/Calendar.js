const db = require('../db');
const Users = require('./User');
const Credits = require('./Credits');

const Calendar = {
    createCalendarTable: async () => {
        try {
            return new Promise((resolve, reject) => {
                db.run(`
                    CREATE TABLE IF NOT EXISTS calendar_events (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        instructor_id INTEGER,
                        student_id INTEGER,
                        date DATE,
                        start_slot INTEGER CHECK(start_slot BETWEEN 0 AND 95),
                        duration INTEGER CHECK(duration > 0),
                        status TEXT CHECK(status IN ('booked', 'blocked')),
                        FOREIGN KEY (instructor_id) REFERENCES instructors(id),
                        FOREIGN KEY (student_id) REFERENCES users(id)
                    );
                `, (err) => {
                    if (err) reject(err);
                    resolve();
                });
            });
        } catch (error) {
            console.error('Error setting up calendar table:', error);
            throw error;
        }
    },

    addEvent: async (instructorId, studentId, date, startSlot, duration, status = 'booked', paymentMethod = 'credits') => {
        try {
            // Check if user has sufficient credits if using credits
            if (paymentMethod === 'credits') {
                const hasCredits = await new Promise((resolve, reject) => {
                    db.get(
                        `SELECT SUM(credits_remaining) as total_credits
                         FROM user_credits
                         WHERE user_id = ?
                         AND (expiry_date IS NULL OR expiry_date >= DATE('now'))`,
                        [studentId],
                        (err, row) => {
                            if (err) reject(err);
                            resolve(row?.total_credits > 0);
                        }
                    );
                });

                if (!hasCredits) {
                    throw new Error('INSUFFICIENT_CREDITS');
                }
            }

            // Proceed with booking
            return new Promise((resolve, reject) => {
                const query = `
                    INSERT INTO calendar_events (
                        instructor_id,
                        student_id,
                        date,
                        start_slot,
                        duration,
                        status
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                db.run(
                    query, 
                    [
                        instructorId,
                        studentId,
                        date,
                        startSlot,
                        duration,
                        status
                    ],
                    async function(err) {
                        if (err) {
                            reject(err);
                            return;
                        }

                        // If using credits, deduct them
                        if (paymentMethod === 'credits') {
                            try {
                                await Credits.useCredit(studentId, this.lastID);
                                resolve(this.lastID);
                            } catch (error) {
                                // If credit deduction fails, rollback the booking
                                await new Promise((resolve) => {
                                    db.run(
                                        'DELETE FROM calendar_events WHERE id = ?',
                                        [this.lastID],
                                        () => resolve()
                                    );
                                });
                                reject(error);
                            }
                        } else {
                            resolve(this.lastID);
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Error booking lesson:', error);
            throw error;
        }
    },

    getInstructorEvents: (instructorId) => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM calendar_events 
                WHERE instructor_id = ? 
                ORDER BY date, start_slot`,
                [instructorId],
                async (err, rows) => {
                    if (err) {
                        console.error('Database error:', err);
                        reject(err);
                        return;
                    }
                    
                    try {
                        // Enrich the data with student names
                        const enrichedRows = await Promise.all(rows.map(async (row) => {
                            if (row.student_id) {
                                const studentName = await Users.getUserName(row.student_id);
                                return { ...row, student_name: studentName };
                            }
                            return { ...row, student_name: null };
                        }));
                        resolve(enrichedRows);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    },

    updateEvent: (eventId, updates) => {
        const { start_slot, duration, status, student_id } = updates;
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE calendar_events 
                 SET start_slot = COALESCE(?, start_slot),
                     duration = COALESCE(?, duration),
                     status = COALESCE(?, status),
                     student_id = COALESCE(?, student_id)
                 WHERE id = ?`,
                [start_slot, duration, status, student_id, eventId],
                (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                }
            );
        });
    },

    deleteEvent: (eventId) => {
        return new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM calendar_events WHERE id = ?',
                [eventId],
                (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                }
            );
        });
    },

    getStudentEvents: (studentId) => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT 
                    calendar_events.*,
                    users.name as instructor_name
                 FROM calendar_events
                 JOIN instructors ON calendar_events.instructor_id = instructors.id
                 JOIN users ON instructors.user_id = users.id
                 WHERE calendar_events.student_id = ?
                 AND calendar_events.date >= DATE('now')
                 ORDER BY calendar_events.date, calendar_events.start_slot`,
                [studentId],
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                }
            );
        });
    }
};

module.exports = Calendar; 