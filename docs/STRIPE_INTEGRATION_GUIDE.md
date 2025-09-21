# Stripe Integration - Implementation Guide

## Overview

This lesson booking application integrates **Stripe** for payment processing, supporting both one-time lesson packages and recurring membership subscriptions. The integration handles payment intents, subscriptions, webhooks, and prorated cancellations with a comprehensive credit system.

## Architecture

### Core Components

1. **Backend Configuration** (`config/stripe.js`) - Stripe client and helper functions
2. **Backend Routes** (`routes/payments.js`, `routes/subscriptions.js`) - Payment and subscription endpoints
3. **Database Models** (`models/PaymentPlan.js`, `models/Subscription.js`, `models/Transactions.js`) - Data persistence
4. **Frontend Components** (`frontend/src/components/StripePaymentForm.vue`) - Payment UI
5. **Frontend Composable** (`frontend/src/composables/useStripe.js`) - Stripe client management
6. **Webhook Handlers** - Event processing for payment confirmations
7. **Cancellation Service** (`services/subscriptionCancellation.js`) - Subscription lifecycle management

## Configuration

### Environment Variables

Required environment variables in `.env`:

```bash
STRIPE_SECRET_KEY=sk_test_...           # Stripe secret key for server-side API calls
STRIPE_PUBLISHABLE_KEY=pk_test_...      # Stripe publishable key for client-side integration
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook endpoint secret for signature verification
```

### Configuration Validation

The application validates Stripe configuration on startup (`config/stripe.js:3-18`):
- Throws errors if any required environment variables are missing
- Ensures proper configuration before accepting requests

### Frontend Key Delivery

Publishable key is securely delivered to frontend via dedicated endpoint:
- **Route**: `GET /api/stripe-key` (public, no authentication required)
- **Response**: `{ publishableKey: "pk_test_..." }`
- **Usage**: Frontend `useStripe()` composable fetches key dynamically

## Payment Types

### 1. One-Time Lesson Packages

**Flow**: Payment Intent → Webhook Confirmation → Credit Addition

**Payment Plans**:
- Type: `one-time`
- Purpose: Purchase lesson credits
- Processing: Immediate credit addition after payment success

**Frontend Process**:
```javascript
// 1. Create payment intent
const response = await fetch('/api/payments/create-payment-intent', {
    body: JSON.stringify({ amount, planId })
});

// 2. Confirm payment with Stripe Elements
const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: paymentMethod.id
});

// 3. Process purchase after confirmation
await fetch('/api/payments/purchase', {
    body: JSON.stringify({ planId, paymentMethod: 'stripe' })
});
```

### 2. Membership Subscriptions

**Flow**: Subscription Creation → Period Management → Recurring Billing

**Payment Plans**:
- Type: `membership`
- Purpose: Monthly access with recurring billing
- Processing: No immediate credits (credits added via webhook events)

**Frontend Process**:
```javascript
// 1. Create payment method
const { paymentMethod } = await stripe.createPaymentMethod({
    elements: elements.value,
    params: { billing_details: { email: userEmail } }
});

// 2. Create subscription
const response = await fetch('/api/subscriptions/create', {
    body: JSON.stringify({ planId, paymentMethodId: paymentMethod.id })
});
```

### 3. Individual Lesson Payments

**Flow**: Direct Payment Intent → Booking Confirmation

**Characteristics**:
- No plan ID (direct lesson payment)
- Used for immediate lesson booking
- Bypasses credit system for direct payment

## Database Schema

### Stripe-Related Fields

**Users Table**:
```sql
stripe_customer_id VARCHAR(255) NULL  -- Links user to Stripe customer
```

**Payment Plans Table**:
```sql
stripe_price_id VARCHAR(255) NULL     -- Links plan to Stripe price object
```

**Subscriptions Table**:
```sql
stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE  -- Links to Stripe subscription
current_period_start DATE NULL        -- Billing period start
current_period_end DATE NULL          -- Billing period end
cancel_at_period_end BOOLEAN DEFAULT false -- Cancellation flag
```

**Transactions Table**:
```sql
payment_intent_id VARCHAR(255) NULL   -- Links to Stripe payment intent
stripe_customer_id VARCHAR(255) NULL  -- Customer reference
payment_method ENUM('stripe', 'cash', 'credits') -- Payment method used
status ENUM('pending', 'completed', 'failed') -- Transaction status
```

## Payment Flow Details

### One-Time Purchase Flow

1. **Payment Intent Creation** (`routes/payments.js:78-113`)
   - Creates pending transaction record
   - Generates Stripe payment intent with metadata
   - Returns client secret to frontend

2. **Frontend Payment Confirmation** (`StripePaymentForm.vue:181-233`)
   - Confirms payment using Stripe Elements
   - Handles payment method creation and confirmation
   - Processes successful payments

3. **Webhook Confirmation** (`routes/payments.js:116-177`)
   - Receives `payment_intent.succeeded` event
   - Completes purchase via `PaymentPlan.purchase()`
   - Updates transaction status and adds credits

4. **Credit Addition** (`models/PaymentPlan.js:80-83`)
   - Only for `one-time` plans (lesson packages)
   - Credits added with appropriate expiry dates
   - Purchase confirmation email queued

### Subscription Flow

1. **Customer Management** (`routes/subscriptions.js:56-72`)
   - Creates or retrieves Stripe customer
   - Stores `stripe_customer_id` in user record
   - Links payment method to customer

2. **Price Management** (`routes/subscriptions.js:86-110`)
   - Creates Stripe price if not exists
   - Stores `stripe_price_id` in payment plan
   - Handles recurring billing configuration

3. **Subscription Creation** (`routes/subscriptions.js:113-133`)
   - Creates Stripe subscription with metadata
   - Records subscription in local database
   - Calculates billing periods based on plan duration

4. **Webhook Processing** (`routes/subscriptions.js:372-458`)
   - `customer.subscription.updated`: Updates periods and adds credits
   - `customer.subscription.deleted`: Cleans up recurring bookings
   - Maintains synchronization between Stripe and local database

## Webhook Integration

### Webhook Security

**Signature Verification** (`config/stripe.js:78-89`):
```javascript
function verifyWebhookSignature(payload, signature) {
    return stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
    );
}
```

### Payment Webhooks (`routes/payments.js:116-177`)

**`payment_intent.succeeded`**:
- Finds pending transaction by payment intent ID
- Completes purchase through `PaymentPlan.purchase()`
- Updates transaction status to 'completed'
- Handles errors gracefully with 'failed' status

**`payment_intent.payment_failed`**:
- Updates transaction status to 'failed'
- Enables retry logic and error tracking

### Subscription Webhooks (`routes/subscriptions.js:365-465`)

**`customer.subscription.updated`**:
- Updates subscription status and billing periods
- Adds credits for active subscriptions
- Cleans up recurring bookings for inactive subscriptions
- Records subscription events for audit trail

**`customer.subscription.deleted`**:
- Updates subscription status to 'canceled'
- Removes associated recurring bookings
- Records deletion event

## Subscription Management

### Cancellation Service (`services/subscriptionCancellation.js`)

**Features**:
- **Prorated Credits**: Calculates unused portion of subscription
- **Sync Detection**: Handles Stripe/database inconsistencies
- **Permission Checks**: Ensures user can only cancel own subscriptions
- **Admin Support**: Allows admin cancellations with audit trail

**Proration Logic** (`models/Subscription.js:167-277`):
```javascript
// 30-day minimum requirement
const thirtyDaysLater = new Date(subscriptionStartDate.getTime() + (30 * 24 * 60 * 60 * 1000));
if (now < thirtyDaysLater) {
    return { eligible: false, reason: 'Must be active for 30 days' };
}

// Credit calculation: 1 credit per unused weekly lesson opportunity
const weeklyLessonsPerMonth = 4;
const unusedWeeklyLessons = Math.ceil(actualRemainingDays / 7);
const creditCompensation = Math.min(unusedWeeklyLessons, weeklyLessonsPerMonth);
```

**Cancellation Process**:
1. Validate subscription ownership
2. Check Stripe status for sync issues
3. Calculate prorated credits (if eligible)
4. Award credits before cancellation
5. Clean up recurring bookings
6. Cancel subscription in Stripe
7. Update local database
8. Record cancellation event

### Preview Cancellation

**Endpoint**: `GET /api/subscriptions/preview-cancellation/:subscriptionId`

**Features**:
- Shows credit calculation without canceling
- Detects sync issues and auto-corrects them
- Warns about recurring booking cleanup
- Provides complete cancellation preview

## Frontend Integration

### Stripe Composable (`frontend/src/composables/useStripe.js`)

**Key Functions**:
- `initializeStripe()`: Fetches publishable key and initializes Stripe
- `createPaymentIntent()`: Creates payment intents for purchases
- `mountPaymentElement()`: Configures Stripe Elements with custom styling

**Styling Configuration**:
```javascript
const options = {
    appearance: {
        theme: 'stripe',
        variables: {
            colorPrimary: '#4F46E5',
            fontFamily: 'system-ui, sans-serif',
            borderRadius: '4px'
        }
    }
}
```

### Payment Form Component (`frontend/src/components/StripePaymentForm.vue`)

**Features**:
- **Unified Interface**: Handles both subscriptions and one-time payments
- **Plan Type Detection**: Automatically determines payment flow based on plan type
- **Error Handling**: Comprehensive error states and user feedback
- **Processing States**: Loading indicators and success confirmation

**Flow Determination**:
```javascript
// Fetches plan details to determine processing flow
const planResponse = await fetch(`/api/payments/plans/${props.planId}`);
const plan = await planResponse.json();

if (plan.type === 'membership') {
    // Handle subscription creation
} else {
    // Handle one-time payment
}
```

## Credit System Integration

### Credit Flow with Stripe

**One-Time Purchases**:
- Credits added immediately after webhook confirmation
- Expiry date based on plan duration
- Used for lesson bookings

**Membership Subscriptions**:
- Credits added during billing period renewals
- Managed through subscription webhook events
- Recurring monthly allocation

**Individual Payments**:
- Bypass credit system entirely
- Direct payment for immediate booking
- No credit allocation

### Credit Usage Pattern

```javascript
// Check sufficient credits
const hasSufficientCredits = await Credits.hasSufficientCredits(userId);

if (hasSufficientCredits) {
    // Use credit for booking
    await Credits.useCredit(userId, eventId);
} else {
    // Trigger Stripe payment flow
    paymentMethod.value = 'direct';
    showPaymentOptions.value = true;
}
```

## Webhook Configuration

### Production Setup

**Webhook endpoints must be configured in the Stripe Dashboard**:
- Payment webhooks: `https://yourdomain.com/api/payments/webhook`
- Subscription webhooks: `https://yourdomain.com/api/subscriptions/webhook`

**Required webhook events**:
- `payment_intent.succeeded` - Completes one-time purchases
- `payment_intent.payment_failed` - Handles payment failures
- `customer.subscription.updated` - Updates subscription status and adds credits
- `customer.subscription.deleted` - Cleans up canceled subscriptions

**Security**: Webhook endpoints verify signatures using `STRIPE_WEBHOOK_SECRET`

### Local Development

Use Stripe CLI to forward webhooks to local development:
```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
stripe listen --forward-to localhost:3000/api/subscriptions/webhook
```

## Testing Considerations

### Test Data Requirements

**Stripe Test Keys**:
- Use test mode keys (sk_test_..., pk_test_...)
- Load from environment variables only - never hardcode in source
- Configure webhook endpoints for test environment

**Test Payment Methods**:
```
4242424242424242  // Successful card
4000000000000002  // Declined card
4000000000009995  // Failed payment
```

**Webhook Testing**:
```bash
# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/payments/webhook
stripe listen --forward-to localhost:3000/api/subscriptions/webhook
```

## Error Handling

### Payment Failures

**Frontend Error Handling**:
- User-friendly error messages
- Retry capability for failed payments
- Graceful degradation to alternative payment methods

**Backend Error Handling**:
- Transaction rollback on payment failures
- Status tracking for failed payments
- Webhook retry logic for temporary failures

### Sync Issues

**Stripe/Database Synchronization**:
- Automatic detection during operations
- Corrective actions in preview endpoints
- Event logging for audit trails
- Graceful handling of timing mismatches

## Security Considerations

### Key Management

- **Secret Key**: Server-side only, never exposed to frontend
- **Publishable Key**: Safe for frontend use, fetched dynamically
- **Webhook Secret**: Used for signature verification only

### Data Protection

- **PCI Compliance**: All sensitive card data handled by Stripe
- **Metadata Usage**: Only non-sensitive data in payment metadata
- **User Verification**: Ownership checks on all operations

## Performance Optimizations

### Async Processing

- **Email Notifications**: Queued to prevent payment blocking
- **Webhook Processing**: Fast response times with background processing
- **Credit Calculations**: Cached results where appropriate

### Database Efficiency

- **Indexed Fields**: `stripe_customer_id`, `stripe_subscription_id`, `payment_intent_id`
- **Batch Operations**: Efficient credit additions and updates
- **Transaction Management**: Proper rollback on failures

## Monitoring and Logging

### Event Tracking

**Subscription Events** (`models/SubscriptionEvent.js`):
- All subscription lifecycle events recorded
- Admin actions tracked with user attribution
- Webhook events logged with full payloads

**Transaction Logging**:
- All payment attempts logged with status
- Failed payments tracked for retry logic
- Payment intent IDs linked for debugging

### Key Metrics

- Payment success rates by method
- Subscription cancellation rates and reasons
- Credit usage patterns and expiry
- Webhook processing latency

---

*This documentation reflects the complete Stripe integration implementation. The system supports both one-time and recurring payments with comprehensive error handling, webhook processing, and credit management. All payment flows are designed for scalability and maintain strict security standards.*
