/**
 * Credit notification utility
 * Handles email notifications based on user credit status changes
 */

const emailQueueService = require('../services/EmailQueueService');
const { sequelize } = require('../db/index');

/**
 * Checks user credit status and sends appropriate email notifications
 * Only sends emails when crossing thresholds downward to avoid spam
 * @param {number} userId - User ID to check
 */
const checkUserCreditsStatus = async (userId) => {
    try {
        // Get user info for email notifications
        const user = await sequelize.models.User.findByPk(userId, {
            attributes: ['id', 'email', 'name']
        });
        
        if (!user) {
            throw new Error('User not found');
        }

        // Import models
        const UserCredits = sequelize.models.UserCredits;
        const CreditUsage = sequelize.models.CreditUsage;

        // Get current total credits across all durations
        const currentResult = await UserCredits.findOne({
            where: {
                user_id: userId,
                credits_remaining: { [sequelize.Op.gt]: 0 },
                [sequelize.Op.or]: [
                    { expiry_date: null },
                    { expiry_date: { [sequelize.Op.gte]: new Date() } }
                ]
            },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('credits_remaining')), 'total_credits']
            ],
            raw: true
        });

        const currentCredits = currentResult?.total_credits || 0;

        // Get the last known credit count from user's metadata/cache
        // For now, we'll store this in a simple way - in production you might use Redis or user metadata
        const lastCredits = user.last_known_credits || null;

        // Update the last known credits for next time
        await user.update({ last_known_credits: currentCredits });

        // Only send emails when crossing thresholds downward
        
        // Credits exhausted: send only when going from >0 to 0
        if (currentCredits === 0 && lastCredits !== null && lastCredits > 0) {
            // User credits exhausted notification sent
            
            const CreditUsage = sequelize.models.CreditUsage;
            const completedLessons = await CreditUsage.count({
                where: { user_id: userId }
            });
            
            await emailQueueService.queueCreditsExhausted(userId, completedLessons);
        }
        // Low balance warning: send only when going from >2 to ≤2 (but not 0)
        else if (currentCredits <= 2 && currentCredits > 0 && lastCredits !== null && lastCredits > 2) {
            // User low balance warning sent
            await emailQueueService.queueLowBalanceWarning(userId, currentCredits);
        }
        // First time checking (lastCredits is null) - only for truly new users
        // In production, this would only happen for users who have never had their credits checked
        // We're being conservative and NOT sending emails on first check to avoid spam
        // No email needed - either credits increased or no threshold crossed
        else {
            // No email notification needed
        }
        
    } catch (error) {
        console.error('Error checking user credit status:', error);
        throw error;
    }
};

module.exports = {
    checkUserCreditsStatus
};
