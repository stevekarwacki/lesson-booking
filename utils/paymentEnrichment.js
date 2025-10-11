/**
 * Utility functions for enriching booking data with payment information
 */

const { Transactions } = require('../models/Transactions');

/**
 * Enriches a single booking event with in-person payment information
 * @param {Object} eventData - The booking event data (plain object)
 * @param {number} studentId - The student ID to look up transactions for
 * @returns {Promise<Object>} The enriched event data
 */
async function enrichEventWithPaymentInfo(eventData, studentId) {
    // Look for in-person payment transaction for this booking
    // We use a date range to match transactions that were created around the same time as the booking
    const bookingDate = new Date(eventData.date);
    const dayBefore = new Date(bookingDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayAfter = new Date(bookingDate);
    dayAfter.setDate(dayAfter.getDate() + 1);
    
    const inPersonTransaction = await Transactions.findOne({
        where: {
            user_id: studentId,
            payment_method: 'in-person',
            created_at: {
                [require('sequelize').Op.between]: [dayBefore, dayAfter]
            }
        },
        order: [['created_at', 'DESC']]
    });
    
    if (inPersonTransaction) {
        eventData.paymentMethod = 'in-person';
        eventData.paymentStatus = inPersonTransaction.status;
    }
    
    return eventData;
}

/**
 * Enriches multiple booking events with in-person payment information
 * @param {Array} events - Array of booking events (Sequelize instances or plain objects)
 * @returns {Promise<Array>} Array of enriched event data
 */
async function enrichEventsWithPaymentInfo(events) {
    return Promise.all(events.map(async (event) => {
        // Handle both Sequelize model instances and plain objects
        const eventData = event.toJSON ? event.toJSON() : event;
        
        // Use student_id from the event data
        const studentId = eventData.student_id;
        if (!studentId) {
            // If no student_id, return the event as-is
            return eventData;
        }
        
        return enrichEventWithPaymentInfo(eventData, studentId);
    }));
}

module.exports = {
    enrichEventWithPaymentInfo,
    enrichEventsWithPaymentInfo
};
