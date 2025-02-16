const db = require('../db');

const createCalendarTable = async () => {
    try {
        return new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS calendar_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    instructor_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    start_time DATETIME NOT NULL,
                    end_time DATETIME NOT NULL,
                    status TEXT DEFAULT 'available' CHECK(status IN ('available', 'booked', 'unavailable')),
                    student_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE,
                    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL
                )
            `, (err) => {
                if (err) reject(err);
                resolve();
            });
        });
    } catch (error) {
        console.error('Error setting up calendar table:', error);
        throw error;
    }
};

const Calendar = {
    createEvent: (event) => {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO calendar_events (instructor_id, title, start_time, end_time, status)
                 VALUES (?, ?, ?, ?, ?)`,
                [event.instructor_id, event.title, event.start_time, event.end_time, event.status || 'available'],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(this.lastID);
                }
            );
        });
    },

    getInstructorEvents: (instructorId) => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM calendar_events WHERE instructor_id = ? ORDER BY start_time`,
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
        const { title, start_time, end_time, status, student_id } = updates;
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE calendar_events 
                 SET title = COALESCE(?, title),
                     start_time = COALESCE(?, start_time),
                     end_time = COALESCE(?, end_time),
                     status = COALESCE(?, status),
                     student_id = COALESCE(?, student_id)
                 WHERE id = ?`,
                [title, start_time, end_time, status, student_id, eventId],
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

module.exports = {
    Calendar,
    createCalendarTable
}; 