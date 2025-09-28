const { Subscription } = require('../models/Subscription');
const { User } = require('../models/User');
const { SubscriptionEvent } = require('../models/SubscriptionEvent');
const { UserCredits } = require('../models/Credits');
const { RecurringBooking } = require('../models/RecurringBooking');
const { stripe, cancelSubscription } = require('../config/stripe');

/**
 * Common subscription cancellation service
 * @param {Object} options - Cancellation options
 * @param {number} options.subscriptionId - ID of subscription to cancel
 * @param {Object} options.requestingUser - User requesting the cancellation
 * @param {boolean} options.isAdminAction - Whether this is an admin action
 * @returns {Object} Cancellation result
 */
async function cancelSubscriptionService({ subscriptionId, requestingUser, isAdminAction = false }) {
    // Validate subscription ID
    if (!subscriptionId || isNaN(subscriptionId)) {
        throw new Error('Invalid subscription ID');
    }
    
    // Get subscription from database with user info
    const subscription = await Subscription.findByPk(subscriptionId, {
        include: [{
            model: User,
            attributes: ['id', 'name', 'email']
        }]
    });
    
    if (!subscription) {
        throw new Error('Subscription not found');
    }
    
    // Authorization check
    if (!isAdminAction && subscription.user_id !== requestingUser.id) {
        throw new Error('Access denied: You can only cancel your own subscription');
    }
    
    // Check if subscription is already canceled in local database
    if (subscription.status === 'canceled') {
        throw new Error('Subscription is already canceled');
    }
    
    // Check Stripe status first
    let stripeSubscription;
    try {
        stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    } catch (error) {
        console.error('Error retrieving subscription from Stripe:', error);
        throw new Error('Failed to retrieve subscription from Stripe');
    }
    
    // If already cancelled in Stripe, sync our database
    if (stripeSubscription.status === 'canceled') {
        // Subscription already cancelled in Stripe, syncing database
        
        // Clean up recurring bookings
        const recurringBooking = await RecurringBooking.findBySubscriptionId(subscriptionId);
        if (recurringBooking) {
            await recurringBooking.destroy();
            // Cleaned up recurring booking for sync
        }
        
        // Update local database to match Stripe
        await subscription.update({
            status: 'canceled',
            canceled_at: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : new Date()
        });
        // Updated subscription status to canceled
        
        // Record subscription event with appropriate info
        const eventType = isAdminAction ? 'admin.subscription.sync_canceled' : 'subscription.sync_canceled';
        const eventData = {
            ...stripeSubscription,
            sync_reason: 'subscription_already_canceled_in_stripe'
        };
        
        if (isAdminAction) {
            eventData.admin_user_id = requestingUser.id;
            eventData.admin_user_name = requestingUser.name;
        }
        
        await SubscriptionEvent.recordEvent(subscription.id, eventType, eventData);
        
        return {
            success: true,
            message: 'Subscription status synchronized - was already cancelled in Stripe',
            cancellation: {
                subscriptionId: subscription.id,
                userId: subscription.user_id,
                userName: subscription.User?.name,
                canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : new Date(),
                stripeStatus: stripeSubscription.status,
                wasSyncIssue: true,
                ...(isAdminAction && { canceledByAdmin: requestingUser.name })
            },
            credits: {
                awarded: 0,
                recurringBookingCleaned: !!recurringBooking
            }
        };
    }
    
    // Calculate prorated credits before cancellation (for active subscriptions)
    const creditCalculation = await Subscription.calculateProratedCredits(subscriptionId);
    
    // Award prorated credits if eligible
    let creditsAwarded = 0;
    if (creditCalculation.eligible && creditCalculation.credits > 0) {
        await UserCredits.addCredits(subscription.user_id, creditCalculation.credits);
        creditsAwarded = creditCalculation.credits;
    }
    
    // Clean up recurring bookings before canceling subscription
    const recurringBooking = await RecurringBooking.findBySubscriptionId(subscriptionId);
    if (recurringBooking) {
        await recurringBooking.destroy();
    }
    
    // Cancel subscription in Stripe
    stripeSubscription = await cancelSubscription(subscription.stripe_subscription_id);
    
    // Update subscription in database - immediate cancellation
    await subscription.update({
        status: 'canceled',
        canceled_at: new Date()
    });
    
    // Record subscription event with appropriate info
    const eventType = isAdminAction ? 'admin.subscription.canceled' : 'subscription.canceled';
    const eventData = {
        ...stripeSubscription,
        credits_awarded: creditsAwarded,
        recurring_booking_cleaned: !!recurringBooking
    };
    
    if (isAdminAction) {
        eventData.admin_user_id = requestingUser.id;
        eventData.admin_user_name = requestingUser.name;
    }
    
    await SubscriptionEvent.recordEvent(subscription.id, eventType, eventData);
    
    // Log the action
    const logMessage = isAdminAction 
        ? `Admin ${requestingUser.name} (ID: ${requestingUser.id}) cancelled subscription ${subscriptionId} for user ${subscription.User?.name} (ID: ${subscription.user_id})`
        : `User ${requestingUser.name} (ID: ${requestingUser.id}) cancelled their subscription ${subscriptionId}`;
    // Log message recorded
    
    const message = isAdminAction 
        ? 'Subscription canceled successfully by admin'
        : 'Subscription canceled successfully';
    
    return {
        success: true,
        message,
        cancellation: {
            subscriptionId: subscription.id,
            userId: subscription.user_id,
            userName: subscription.User?.name,
            canceledAt: new Date(),
            stripeStatus: stripeSubscription.status,
            ...(isAdminAction && { canceledByAdmin: requestingUser.name })
        },
        credits: {
            awarded: creditsAwarded,
            calculation: creditCalculation,
            recurringBookingCleaned: !!recurringBooking
        }
    };
}

module.exports = {
    cancelSubscriptionService
}; 