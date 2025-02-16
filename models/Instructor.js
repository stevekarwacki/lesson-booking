const db = require('../db/index');
const { clearCache } = require('./User');

// Create triggers for instructor role management
const createTriggers = async () => {
    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            try {
                // First check if triggers exist
                const existingTriggers = await new Promise((resolve, reject) => {
                    db.get(
                        "SELECT name FROM sqlite_master WHERE type='trigger' AND name='after_instructor_insert'",
                        (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        }
                    );
                });

                // Only create triggers if they don't exist
                if (!existingTriggers) {
                    await new Promise((resolve, reject) => {
                        db.run(`
                            CREATE TRIGGER after_instructor_insert
                            AFTER INSERT ON instructors
                            BEGIN
                                UPDATE users 
                                SET role = 'instructor' 
                                WHERE id = NEW.user_id;
                            END;
                        `, (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });

                    await new Promise((resolve, reject) => {
                        db.run(`
                            CREATE TRIGGER after_instructor_delete
                            AFTER DELETE ON instructors
                            BEGIN
                                UPDATE users 
                                SET role = 'student' 
                                WHERE id = OLD.user_id;
                            END;
                        `, (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                }
                resolve();
            } catch (error) {
                console.error('Error creating triggers:', error);
                reject(error);
            }
        });
    });
};

const createInstructorsTable = async () => {
    try {
        return new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS instructors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER UNIQUE,
                    bio TEXT,
                    specialties TEXT,
                    hourly_rate DECIMAL(10,2),
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) 
                        REFERENCES users(id) 
                        ON DELETE CASCADE
                )
            `, async (err) => {
                if (err) reject(err);
                // Create triggers after table is created
                await createTriggers();
                resolve();
            });
        });
    } catch (error) {
        console.error('Error setting up instructors table:', error);
        throw error;
    }
};

const createInstructor = async (data) => {
    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            try {
                const { user_id, bio, specialties, hourly_rate } = data;
                
                // Check if user exists
                const user = await new Promise((resolve, reject) => {
                    db.get('SELECT id, role FROM users WHERE id = ?', [user_id], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                if (!user) {
                    throw new Error('User not found');
                }

                // Check if already an instructor
                const instructor = await new Promise((resolve, reject) => {
                    db.get('SELECT * FROM instructors WHERE user_id = ?', [user_id], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                if (instructor) {
                    throw new Error('User is already an instructor');
                }

                // Begin transaction
                await new Promise((resolve, reject) => {
                    db.run('BEGIN TRANSACTION', (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // Add to instructors table
                await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO instructors 
                        (user_id, is_active, bio, specialties, hourly_rate) 
                        VALUES (?, 1, ?, ?, ?)`,
                        [user_id, bio, specialties, hourly_rate],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });

                // Commit transaction
                await new Promise((resolve, reject) => {
                    db.run('COMMIT', (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // Clear the user's cache entry
                await clearCache(user_id);

                resolve();
            } catch (error) {
                db.run('ROLLBACK', () => {
                    reject(error);
                });
            }
        });
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

const updateInstructor = async (instructorId, updates) => {
    console.log('Updating instructor:', instructorId);
    console.log('Update data:', updates);
    
    return new Promise((resolve, reject) => {
        const { hourly_rate, specialties, bio } = updates;
        
        const query = `
            UPDATE instructors 
            SET hourly_rate = ?, 
                specialties = ?, 
                bio = ?
            WHERE id = ?`;
        const params = [hourly_rate, specialties, bio, instructorId];
        
        console.log('SQL Query:', query);
        console.log('Parameters:', params);
        
        db.run(query, params, function(err) {
            if (err) {
                console.error('Database error:', err);
                reject(err);
            } else {
                console.log('Rows affected:', this.changes);
                resolve();
            }
        });
    });
};

const deleteInstructor = async (instructorId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT user_id FROM instructors WHERE id = ?', [instructorId], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (!row) {
                reject(new Error('Instructor not found'));
                return;
            }

            db.run('DELETE FROM instructors WHERE id = ?', [instructorId], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    });
};

const toggleActive = (id) => {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE instructors SET is_active = NOT is_active WHERE id = ?',
            [id],
            (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            }
        );
    });
};

const getAll = () => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT i.*, u.name, u.email 
             FROM instructors i
             JOIN users u ON i.user_id = u.id`,
            [],
            (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            }
        );
    });
};

const getAllActive = () => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT i.*, u.name, u.email 
             FROM instructors i
             JOIN users u ON i.user_id = u.id
             WHERE i.is_active = 1`,
            [],
            (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            }
        );
    });
};

const findByUserId = (userId) => {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM instructors WHERE user_id = ?',
            [userId],
            (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            }
        );
    });
};

const Instructor = {
    createInstructorsTable,
    createInstructor,
    getInstructorByUserId,
    getAllInstructors,
    updateInstructor,
    deleteInstructor,
    toggleActive,
    getAll,
    getAllActive,
    findByUserId
};

module.exports = Instructor 