const { Calendar } = require('../models/Calendar');
const { Transactions } = require('../models/Transactions');
const { UserCredits, CreditUsage } = require('../models/Credits');
const { Refund } = require('../models/Refund');
const { sequelize } = require('../db/index');
const { stripe } = require('../config/stripe');
const { fromString, createDateHelper } = require('../utils/dateHelpers');

/**
 * RefundService - Handles refund processing for both Stripe and credit refunds
 * 
 * This service encapsulates the complex business logic for:
 * - Determining refund eligibility and method
 * - Processing Stripe refunds via API
 * - Processing credit refunds
 * - Maintaining audit trails
 * - Error handling and rollback
 */
class RefundService {
    constructor() {
        this.stripe = stripe;
    }

    /**
     * Get refund information for a booking
     * @param {number} bookingId - Calendar event ID
     * @returns {Object} Refund eligibility and method information
     */
    async getRefundInfo(bookingId) {
        const booking = await Calendar.findByPk(bookingId, {
            include: [
                {
                    model: sequelize.models.User,
                    as: 'student',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });

        if (!booking) {
            throw new Error('Booking not found');
        }

        // Check if booking has already been refunded
        const existingRefund = await Refund.hasRefund(bookingId);
        if (existingRefund) {
            throw new Error('Booking has already been refunded');
        }

        // Check if booking was paid with credits
        const creditUsage = await CreditUsage.findOne({
            where: { calendar_event_id: bookingId }
        });

        // Check if booking was paid with Stripe
        const stripeTransaction = await Transactions.findOne({
            where: { 
                user_id: booking.student_id,
                payment_method: 'stripe',
                status: ['completed', 'pending'] // Include both completed and pending transactions
            },
            order: [['created_at', 'DESC']] // Get most recent transaction
        });


        return {
            booking,
            paidWithCredits: !!creditUsage,
            paidWithStripe: !!stripeTransaction && !creditUsage,
            creditUsage,
            stripeTransaction,
            canRefund: booking.status !== 'cancelled'
        };
    }

    /**
     * Process a refund for a booking
     * @param {number} bookingId - Calendar event ID
     * @param {string} refundType - 'stripe' or 'credit'
     * @param {number} refundedByUserId - ID of user issuing the refund
     * @param {string} reason - Optional reason for refund
     * @returns {Object} Refund result
     */
    async processRefund(bookingId, refundType, refundedByUserId, reason = null) {
        const transaction = await sequelize.transaction();
        
        try {
            const refundInfo = await this.getRefundInfo(bookingId);
            const { booking, creditUsage, stripeTransaction } = refundInfo;

            // Validate refund type against payment method
            if (refundType === 'stripe' && !refundInfo.paidWithStripe) {
                throw new Error('Cannot refund to Stripe - booking was not paid with Stripe');
            }

            let refundResult;
            let refundAmount = 0;

            if (refundType === 'stripe') {
                refundResult = await this._processStripeRefund(booking, stripeTransaction, transaction);
                refundAmount = stripeTransaction.amount; // Use original transaction amount in dollars
            } else {
                refundResult = await this._processCreditRefund(booking, creditUsage, refundedByUserId, transaction);
                refundAmount = 0; // Credit refunds don't have monetary amount
            }

            // Create refund record (no need to update booking table)
            const refundRecord = await Refund.create({
                booking_id: bookingId,
                original_transaction_id: stripeTransaction?.id || null,
                refund_transaction_id: refundResult.id || null,
                amount: refundAmount,
                type: refundType,
                refunded_by: refundedByUserId,
                reason
            }, { transaction });

            await transaction.commit();

            return {
                success: true,
                refundId: refundRecord.id,
                refundType,
                amount: refundAmount,
                stripeRefundId: refundResult.id || null
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Process Stripe refund
     * @private
     */
    async _processStripeRefund(booking, stripeTransaction, transaction) {
        if (!stripeTransaction) {
            throw new Error('No Stripe transaction found for this booking');
        }

        if (!stripeTransaction.payment_intent_id) {
            throw new Error('No Stripe payment intent found for this booking');
        }

        try {
            // Call Stripe API to create refund
            const refund = await this.stripe.refunds.create({
                payment_intent: stripeTransaction.payment_intent_id,
                amount: Math.round(stripeTransaction.amount * 100), // Convert dollars to cents for Stripe
                reason: 'requested_by_customer'
            });

            // Stripe refunds are typically 'pending' initially, then become 'succeeded'
            if (refund.status !== 'succeeded' && refund.status !== 'pending') {
                throw new Error(`Stripe refund failed: ${refund.status}`);
            }

            return refund;
        } catch (error) {
            // Handle Stripe API errors
            if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
                throw new Error(`Stripe refund failed: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Process credit refund
     * @private
     */
    async _processCreditRefund(booking, creditUsage, refundedByUserId, transaction) {
        const durationMinutes = booking.duration * 15; // Convert slots to minutes
        const creditsToRefund = durationMinutes === 60 ? 1 : 1; // 1 credit for both 30 and 60 minute lessons


        // Add credits back to user's account
        await UserCredits.addCredits(
            booking.student_id,
            creditsToRefund,
            null, // No expiry date for refunded credits
            durationMinutes,
            transaction
        );


        return {
            id: `credit_refund_${Date.now()}`,
            credits_refunded: creditsToRefund,
            duration_minutes: durationMinutes
        };
    }

    /**
     * Check if automatic refund is eligible (for student cancellations >24 hours)
     * @param {Object} booking - Booking object with date and start_slot
     * @returns {boolean} Whether automatic refund is eligible
     */
    isEligibleForAutomaticRefund(booking) {
        if (!booking || !booking.date) return false;
        
        // Create booking datetime by combining date and start_slot
        const bookingDate = new Date(booking.date + 'T00:00:00Z');
        
        if (booking.start_slot !== undefined) {
            const hours = Math.floor(booking.start_slot / 4);
            const minutes = (booking.start_slot % 4) * 15;
            bookingDate.setUTCHours(hours, minutes, 0, 0);
        }
        
        const bookingHelper = fromString(booking.date);
        const nowHelper = createDateHelper();
        const hoursUntil = nowHelper.diffInHours(bookingHelper);
        
        // Eligible if booking is more than 24 hours away
        return hoursUntil > 24;
    }

    /**
     * Process automatic refund for student cancellation
     * @param {number} bookingId - Calendar event ID
     * @param {number} studentId - Student user ID
     * @returns {Object} Refund result or null if not eligible
     */
    async processAutomaticRefund(bookingId, studentId) {
        const refundInfo = await this.getRefundInfo(bookingId);
        
        if (!this.isEligibleForAutomaticRefund(refundInfo.booking)) {
            return null; // Not eligible for automatic refund
        }

        // Determine refund method based on original payment
        // Students always get their original payment method back
        const refundType = refundInfo.paidWithStripe ? 'stripe' : 'credit';
        
        return await this.processRefund(
            bookingId,
            refundType,
            studentId,
            'Automatic refund - cancelled >24 hours in advance'
        );
    }
}

module.exports = RefundService;
