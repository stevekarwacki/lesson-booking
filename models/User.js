const db = require('../db/index');
const cache = require('../db/cache');

const CACHE_KEYS = {
    allUsers: 'users:all',
    userById: (id) => `users:${id}`
};

const createUsersTable = async () => {
    try {
        return new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT DEFAULT 'student',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
                resolve();
            });
        });
    } catch (error) {
        console.error('Error setting up users table:', error);
        throw error;
    }
};

const clearCache = async (userId = null) => {
    try {
        await cache.del(CACHE_KEYS.allUsers);
        if (userId) {
            await cache.del(CACHE_KEYS.userById(userId));
        }
    } catch (err) {
        console.error('Cache clear error:', err);
    }
};

const findByEmail = (email) => { 
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM users WHERE email = ?',
            [email],
            (err, row) => {
                if (err) reject(err);
                resolve(row);
            }
        );
    });
};

const createUser = async (userData) => {
    return new Promise((resolve, reject) => {
        console.log(userData.name);
        db.run(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [userData.name, userData.email, userData.password, userData.role || 'student'],
            async function(err) {
                if (err) reject(err);
                await clearCache();
                resolve(this.lastID);
            }
        );
    });
};

const findAll = () => {
    return new Promise(async (resolve, reject) => {
        try {
            // Try cache first
            const cachedUsers = await cache.get(CACHE_KEYS.allUsers);
            if (cachedUsers && Array.isArray(cachedUsers)) {
                return resolve(cachedUsers);
            }

            // If not in cache, get from database
            db.all('SELECT * FROM users', [], async (err, users) => {
                if (err) {
                    console.error('Database error:', err);
                    return reject(err);
                }

                if (!users || !Array.isArray(users)) {
                    console.error('Invalid users data:', users);
                    return reject(new Error('Invalid users data'));
                }

                // Cache the results
                try {
                    await cache.set(CACHE_KEYS.allUsers, users, 3600); // Cache for 1 hour
                } catch (cacheErr) {
                    console.error('Cache error:', cacheErr);
                }

                resolve(users);
            });
        } catch (err) {
            console.error('findAll error:', err);
            reject(err);
        }
    });
};

const findById = async (id) => {
    try {
        // Try cache first
        const cachedUser = await cache.get(CACHE_KEYS.userById(id));
        if (cachedUser) {
            return cachedUser;
        }

        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE id = ?',
                [id],
                async (err, user) => {
                    if (err) reject(err);
                    if (user) {
                        await cache.set(CACHE_KEYS.userById(id), user, 3600);
                    }
                    resolve(user);
                }
            );
        });
    } catch (err) {
        console.error('findById error:', err);
        throw err;
    }
};

const updateUser = (id, updates) => {
    return new Promise((resolve, reject) => {
        const fields = [];
        const values = [];
        
        if (updates.name !== undefined) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        
        if (updates.email !== undefined) {
            fields.push('email = ?');
            values.push(updates.email);
        }
        
        if (updates.password !== undefined) {
            fields.push('password = ?');
            values.push(updates.password);
        }
        
        if (fields.length === 0) {
            resolve();
            return;
        }

        values.push(id);
        
        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
        
        db.run(query, values, (err) => {
            if (err) {
                console.error('Database error:', err);
                reject(err);
                return;
            }
            resolve();
        });
    });
};

const deleteUser = async (id) => {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM users WHERE id = ?',
            [id],
            async (err) => {
                if (err) reject(err);
                await clearCache(id);
                resolve();
            }
        );
    });
};

const updateUserRole = (userId, role) => {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET role = ? WHERE id = ?',
            [role, userId],
            async (err) => {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                    return;
                }
                
                // Clear user cache if using caching
                try {
                    await clearCache(userId);
                } catch (cacheErr) {
                    console.error('Cache clear error:', cacheErr);
                    // Don't reject for cache errors
                }
                
                resolve();
            }
        );
    });
};

const setApprovalStatus = (userId, isApproved) => {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET is_approved = ? WHERE id = ?',
            [isApproved ? 1 : 0, userId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
};

module.exports = {
    createUsersTable,
    clearCache,
    createUser,
    findByEmail,
    findAll,
    findById,
    updateUser,
    deleteUser,
    updateUserRole,
    setApprovalStatus
}; 