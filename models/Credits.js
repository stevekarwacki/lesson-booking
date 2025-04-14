const db = require('../db');

module.exports = {
    getUserCredits: (userId) => {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT SUM(credits_remaining) as total_credits,
                 MIN(expiry_date) as next_expiry
                 FROM user_credits
                 WHERE user_id = ?
                 AND (expiry_date IS NULL OR expiry_date >= DATE('now'))`,
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row || { total_credits: 0, next_expiry: null });
                }
            );
        });
    },

    addCredits: (userId, credits, expiryDate = null) => {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO user_credits (user_id, credits_remaining, expiry_date)
                 VALUES (?, ?, ?)`,
                [userId, credits, expiryDate],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    },

    // New method to use a credit
    useCredit: async (userId, eventId) => {
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE user_credits
                 SET credits_remaining = credits_remaining - 1
                 WHERE user_id = ?
                 AND credits_remaining > 0
                 AND (expiry_date IS NULL OR expiry_date >= DATE('now'))`,
                [userId],
                async function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (this.changes === 0) {
                        reject(new Error('INSUFFICIENT_CREDITS'));
                        return;
                    }

                    // Record credit usage
                    try {
                        await new Promise((resolve, reject) => {
                            db.run(
                                `INSERT INTO credit_usage (user_id, calendar_event_id)
                                 VALUES (?, ?)`,
                                [userId, eventId],
                                (err) => {
                                    if (err) reject(err);
                                    resolve();
                                }
                            );
                        });
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }
};
