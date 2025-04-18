const db = require('../db');

module.exports = {
    recordTransaction: (userId, planId, amount, paymentMethod, status = 'completed') => {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO transactions (
                    user_id, 
                    payment_plan_id, 
                    amount, 
                    payment_method, 
                    status
                ) VALUES (?, ?, ?, ?, ?)`,
                [userId, planId, amount, paymentMethod, status],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    },

    getTransactions: (userId) => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT 
                    t.*,
                    p.name as plan_name
                FROM transactions t
                LEFT JOIN payment_plans p ON t.payment_plan_id = p.id
                WHERE t.user_id = ?
                ORDER BY t.created_at DESC`,
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                }
            );
        });
    }
}; 