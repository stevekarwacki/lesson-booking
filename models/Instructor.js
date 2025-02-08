const db = require('../db/index');

const createInstructorsTable = async () => {
    try {
        return new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS instructors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    bio TEXT,
                    specialties TEXT,
                    hourly_rate DECIMAL(10,2),
                    availability TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `, (err) => {
                if (err) reject(err);
                resolve();
            });
        });
    } catch (error) {
        console.error('Error setting up instructors table:', error);
        throw error;
    }
};

const createInstructor = (instructorData) => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO instructors (
                user_id, 
                bio, 
                specialties, 
                hourly_rate, 
                availability
            ) VALUES (?, ?, ?, ?, ?)`,
            [
                instructorData.user_id,
                instructorData.bio,
                instructorData.specialties,
                instructorData.hourly_rate,
                instructorData.availability
            ],
            function(err) {
                if (err) reject(err);
                resolve(this.lastID);
            }
        );
    });
};

const getInstructorByUserId = (userId) => {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT i.*, u.name, u.email 
             FROM instructors i
             JOIN users u ON i.user_id = u.id
             WHERE i.user_id = ?`,
            [userId],
            (err, row) => {
                if (err) reject(err);
                resolve(row);
            }
        );
    });
};

const getAllInstructors = () => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT i.*, u.name, u.email 
             FROM instructors i
             JOIN users u ON i.user_id = u.id`,
            [],
            (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            }
        );
    });
};

const updateInstructor = (userId, updates) => {
    const { bio, specialties, hourly_rate, availability } = updates;
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE instructors 
             SET bio = ?, specialties = ?, hourly_rate = ?, availability = ?
             WHERE user_id = ?`,
            [bio, specialties, hourly_rate, availability, userId],
            (err) => {
                if (err) reject(err);
                resolve();
            }
        );
    });
};

const deleteInstructor = (userId) => {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM instructors WHERE user_id = ?',
            [userId],
            (err) => {
                if (err) reject(err);
                resolve();
            }
        );
    });
};

module.exports = {
    createInstructorsTable,
    createInstructor,
    getInstructorByUserId,
    getAllInstructors,
    updateInstructor,
    deleteInstructor
}; 