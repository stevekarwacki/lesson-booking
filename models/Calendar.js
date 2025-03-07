const db = require('../db');

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

    addEvent: async (instructorId, studentId, date, startSlot, duration, status = 'booked') => {
        try {
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
                    function(err) {
                        if (err) reject(err);
                        resolve(this.lastID);
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
                (err, rows) => {
                    if (err) {
                        console.error('Database error:', err);
                        reject(err);
                        return;
                    }
                    resolve(rows);
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
    }
};

module.exports = Calendar; 