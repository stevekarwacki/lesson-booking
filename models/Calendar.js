const db = require('../db');

const Calendar = {
    createCalendarTable: async () => {
        try {
            return new Promise((resolve, reject) => {
                db.run(`
                    CREATE TABLE IF NOT EXISTS calendar_events (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        instructor_id INTEGER NOT NULL REFERENCES instructors(id),
                        student_id INTEGER NOT NULL REFERENCES users(id),
                        start_time DATETIME UNIQUE NOT NULL,
                        end_time DATETIME UNIQUE NOT NULL,
                        status TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        CHECK (end_time > start_time)
                    );
    
                    CREATE INDEX IF NOT EXISTS idx_calendar_events_instructor_time 
                    ON calendar_events(instructor_id, start_time, end_time);
    
                    CREATE INDEX IF NOT EXISTS idx_calendar_events_student 
                    ON calendar_events(student_id);
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

    addEvent: async (instructorId, studentId, startTime, endTime, status = 'pending') => {
        try {
            return new Promise((resolve, reject) => {
                const query = `
                    INSERT INTO calendar_events (
                        instructor_id,
                        student_id,
                        start_time,
                        end_time,
                        status
                    ) VALUES (?, ?, ?, ?, ?)
                `;
                
                db.run(
                    query, 
                    [
                        instructorId,
                        studentId,
                        startTime,
                        endTime,
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

module.exports = Calendar; 