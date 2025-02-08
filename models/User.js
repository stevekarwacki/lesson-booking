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

const updateUser = async (id, userData) => {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
            [userData.name, userData.email, userData.role, id],
            async (err) => {
                if (err) reject(err);
                await clearCache(id);
                resolve();
            }
        );
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

const updateUserRole = async (userId, role) => {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET role = ? WHERE id = ?',
            [role, userId],
            async (err) => {
                if (err) reject(err);
                await clearCache(userId);
                resolve();
            }
        );
    });
};

module.exports = {
    createUsersTable,
    createUser,
    findByEmail,
    findAll,
    findById,
    updateUser,
    deleteUser,
    updateUserRole
}; 