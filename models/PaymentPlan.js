const db = require('../db');
const Credits = require('./Credits');
const Transactions = require('./Transactions');

module.exports = {
    getAll: () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM payment_plans ORDER BY price ASC', [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    },

    getById: (id) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM payment_plans WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    },

    purchase: async (userId, planId, paymentMethod) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Start a transaction
                await new Promise((resolve, reject) => {
                    db.run('BEGIN TRANSACTION', (err) => {
                        if (err) reject(err);
                        resolve();
                    });
                });

                // Get the plan
                const plan = await module.exports.getById(planId);
                if (!plan) {
                    throw new Error('Plan not found');
                }

                // Calculate expiry date if it's a membership
                const expiryDate = plan.type === 'membership' 
                    ? new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000)
                    : null;

                // Record the transaction
                await Transactions.recordTransaction(userId, planId, plan.price, paymentMethod);

                // Add credits
                await Credits.addCredits(userId, plan.credits, expiryDate);

                // Commit the transaction
                await new Promise((resolve, reject) => {
                    db.run('COMMIT', (err) => {
                        if (err) reject(err);
                        resolve();
                    });
                });

                resolve({ success: true });
            } catch (error) {
                // Rollback on error
                await new Promise((resolve) => {
                    db.run('ROLLBACK', () => resolve());
                });
                reject(error);
            }
        });
    }
};
