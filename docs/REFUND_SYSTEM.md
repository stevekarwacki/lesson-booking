# Refund System Documentation

## Overview

The refund system provides comprehensive functionality for processing refunds of lesson bookings through both Stripe payment reversals and lesson credit restoration. The system supports role-based permissions, automatic refunds for student cancellations, and maintains complete audit trails.

## Architecture

### Core Components

1. **RefundService** (`/services/RefundService.js`)
   - Centralized business logic for refund processing
   - Handles both Stripe and credit refunds
   - Manages eligibility checks and automatic refunds

2. **Refund Model** (`/models/Refund.js`)
   - Database model for refund audit trail
   - Tracks refund transactions and metadata

3. **API Endpoints** (`/routes/admin.js`)
   - `GET /api/admin/refunds/:bookingId/info` - Get refund information
   - `POST /api/admin/refunds` - Process manual refunds

4. **Frontend Components**
   - `RefundModal.vue` - User interface for refund processing
   - Integration with booking lists and calendar views

## Database Schema

### Refunds Table

```sql
CREATE TABLE refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL REFERENCES calendar_events(id),
    original_transaction_id INTEGER REFERENCES transactions(id),
    refund_transaction_id VARCHAR(255), -- Stripe refund ID or internal ID
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'stripe' or 'credit'
    refunded_by INTEGER NOT NULL REFERENCES users(id),
    reason TEXT,
    created_at DATETIME NOT NULL
);
```

### Key Relationships

- **Refunds ↔ Calendar Events**: One-to-many (one booking can have multiple refund attempts, but only one successful)
- **Refunds ↔ Users**: Many-to-one (tracks who processed the refund)
- **Refunds ↔ Transactions**: Many-to-one (links to original payment transaction)

## Business Logic

### Refund Eligibility

#### Automatic Refunds (Student Cancellations)
- **Eligible**: Bookings cancelled >24 hours in advance
- **Refund Method**: Original payment method (Stripe → Stripe, Credits → Credits)
- **Processing**: Automatic during cancellation API call

#### Manual Refunds (Admin/Instructor)
- **Eligible**: Any non-cancelled booking
- **Refund Method**: Configurable based on original payment and user role
- **Processing**: Through RefundModal interface

### Payment Method Logic

#### Stripe Refunds
- **Requirements**: Valid `payment_intent_id` in transactions table
- **Process**: Real Stripe API call to `stripe.refunds.create()`
- **Currency**: Converts dollars to cents for Stripe API
- **Status**: Accepts 'succeeded' or 'pending' Stripe responses

#### Credit Refunds
- **Requirements**: Credit usage record or admin/instructor override
- **Process**: Adds credits back to student's account
- **Amount**: 1 credit per lesson (regardless of 30/60 minute duration)
- **Expiry**: Refunded credits have no expiration date

### Permission System

#### Role-Based Access

**Admins**:
- Can refund any booking
- Can choose refund method for any payment type
- Full access to refund information

**Instructors**:
- Can refund bookings for their own students only
- Same refund method options as admins
- Restricted by instructor-student relationship

**Students**:
- Cannot manually process refunds
- Automatic refunds only through cancellation
- Always receive original payment method

#### Permission Implementation

```javascript
// CASL Abilities (utils/abilities.js)
can('refund', 'Booking'); // Admin - all bookings
can('refund', 'Booking', { instructor_id: user.instructor_id }); // Instructor - own students

// Route Authorization (routes/admin.js)
authorize('refund', 'Booking') // CASL middleware
// + custom instructor validation for specific bookings
```

## API Documentation

### GET /api/admin/refunds/:bookingId/info

Retrieves refund information and available options for a booking.

**Authentication**: Required (Admin/Instructor)
**Authorization**: Admin (all bookings) | Instructor (own students only)

**Response**:
```json
{
  "booking": {
    "id": 123,
    "student_id": 2,
    "instructor_id": 1,
    "date": "2025-12-01",
    "status": "booked",
    "student": { "name": "John Doe" }
  },
  "canRefund": true,
  "paidWithStripe": true,
  "paidWithCredits": false,
  "refundOptions": [
    {
      "type": "stripe",
      "label": "Original Payment Method",
      "amount": 50.00
    },
    {
      "type": "credit",
      "label": "Lesson Credits",
      "amount": 0
    }
  ],
  "refundStatus": {
    "status": "none" // or "refunded"
  }
}
```

**Error Responses**:
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Booking not found
- `400 Bad Request`: Already refunded or invalid booking

### POST /api/admin/refunds

Processes a manual refund for a booking.

**Authentication**: Required (Admin/Instructor)
**Authorization**: Same as GET endpoint

**Request Body**:
```json
{
  "bookingId": 123,
  "refundType": "stripe", // or "credit"
  "reason": "Customer requested refund" // optional
}
```

**Response**:
```json
{
  "success": true,
  "refund": {
    "id": 456,
    "type": "stripe",
    "amount": 50.00,
    "stripeRefundId": "re_1234567890"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Validation errors, already refunded, or business rule violations
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Stripe API errors or system failures

## Frontend Integration

### RefundModal Component

**Props**:
- `booking`: Booking object with id, date, student info
- `show`: Boolean to control modal visibility

**Events**:
- `close`: Modal close request
- `refund-processed`: Successful refund completion with result data

**Usage Example**:
```vue
<RefundModal
  v-if="showRefundModal"
  :booking="selectedBooking"
  @close="closeRefundModal"
  @refund-processed="handleRefundProcessed"
/>
```

### Integration Points

1. **BookingList Component**: Refund button with permission checks
2. **InstructorCalendar**: Refund functionality in daily booking views
3. **UserManager**: Admin interface for user booking management
4. **UserBookings**: Student view with refund status display

### State Management

**Refund Status Display**:
```javascript
// Booking objects include refundStatus
booking.refundStatus = {
  status: 'refunded', // or 'none'
  type: 'stripe',     // or 'credit'
  amount: 50.00,
  refunded_at: '2025-10-01T10:00:00Z'
}
```

**Button Visibility Logic**:
```javascript
// Hide refund button after successful refund
const showRefundButton = computed(() => 
  canRefundBooking.value && 
  booking.refundStatus?.status !== 'refunded'
)
```

## Error Handling

### Common Error Scenarios

1. **Missing Payment Intent**: Stripe transactions without `payment_intent_id`
   - **Cause**: Test data or incomplete payment processing
   - **Handling**: Clear error message, suggest checking payment records

2. **Stripe API Failures**: Network issues or invalid payment intents
   - **Cause**: External service problems or expired payment intents
   - **Handling**: Retry logic, fallback to credit refund option

3. **Permission Violations**: Instructors accessing other instructors' bookings
   - **Cause**: URL manipulation or session issues
   - **Handling**: 403 responses with clear permission messages

4. **Concurrent Refunds**: Multiple refund attempts on same booking
   - **Cause**: Race conditions or user error
   - **Handling**: Database constraints and duplicate detection

### Error Recovery

**Database Transactions**: All refund operations use database transactions for atomicity
**Rollback Logic**: Failed Stripe calls trigger complete transaction rollback
**Audit Trail**: All refund attempts (successful and failed) are logged

## Testing Strategy

### Unit Tests (`/tests/refund.test.js`)

**Coverage Areas**:
- RefundService business logic
- Eligibility calculations
- Currency conversions
- Error handling scenarios
- Database transaction management

**Key Test Cases**:
- Automatic refund eligibility (24-hour rule)
- Credit vs Stripe refund processing
- Permission validation
- Concurrent refund prevention
- Currency conversion accuracy

### Integration Tests (`/tests/refund-integration.test.js`)

**Coverage Areas**:
- API endpoint functionality
- Authentication and authorization
- Database integration
- Error response handling
- Permission edge cases

**Key Test Cases**:
- Admin vs instructor access patterns
- Cross-instructor permission violations
- Malformed request handling
- Already refunded booking scenarios

### Frontend Tests (`/frontend/src/tests/RefundModal.test.js`)

**Coverage Areas**:
- Component rendering and props
- User interaction flows
- API integration
- Error state handling
- Accessibility compliance

**Key Test Cases**:
- Modal lifecycle management
- Refund option selection
- Form submission and validation
- Loading and error states
- Date/time formatting accuracy

## Configuration

### Environment Variables

```bash
# Stripe Configuration (required for production)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Development Mode (optional)
NODE_ENV=development # Enables mock Stripe for testing
```

### Stripe Configuration (`/config/stripe.js`)

**Setup Requirements**:
1. Valid Stripe account with API keys
2. Webhook endpoint configuration
3. Test mode for development environment

**Currency Handling**:
- Database: Stores amounts in dollars (50.00)
- Stripe API: Requires amounts in cents (5000)
- Conversion: `Math.round(dollars * 100)`

## Deployment Considerations

### Database Migrations

**Required Migrations**:
1. `20241004000002-create-refunds-table.js` - Creates refunds table
2. Calendar model updates for refund associations

**Migration Command**:
```bash
# Migrations run automatically on server startup
npm start
```

### Stripe Webhook Setup

**Webhook Events** (for future enhancement):
- `payment_intent.succeeded`
- `refund.created`
- `refund.updated`

**Endpoint**: `POST /api/webhooks/stripe`
**Security**: Webhook signature verification required

### Monitoring and Logging

**Key Metrics**:
- Refund success/failure rates
- Average refund processing time
- Stripe API response times
- Permission violation attempts

**Log Levels**:
- `INFO`: Successful refund processing
- `WARN`: Permission violations, invalid requests
- `ERROR`: Stripe API failures, system errors

## Security Considerations

### Data Protection

**Sensitive Data**:
- Stripe payment intent IDs (encrypted in transit)
- Refund amounts and transaction details
- User payment information (never stored locally)

**Access Controls**:
- JWT token authentication required
- Role-based permission enforcement
- Instructor-student relationship validation

### Input Validation

**API Endpoints**:
- Booking ID format validation
- Refund type enumeration
- Reason text sanitization (XSS prevention)

**Frontend**:
- Client-side validation for UX
- Server-side validation for security
- CSRF protection via JWT tokens

## Troubleshooting

### Common Issues

**"No Stripe payment intent found"**:
- Check transactions table for `payment_intent_id`
- Verify Stripe webhook processing
- Confirm payment completion status

**"Permission denied" for instructors**:
- Verify instructor record exists for user
- Check booking instructor_id matches user's instructor record
- Confirm CASL abilities configuration

**Refund button not disappearing**:
- Check refund status in database
- Verify frontend refund status fetching
- Confirm component state updates after refund

**Currency amount discrepancies**:
- Verify dollar-to-cents conversion in Stripe calls
- Check database amount storage format
- Confirm frontend display formatting

### Debug Tools

**Database Queries**:
```sql
-- Check refund status for booking
SELECT * FROM refunds WHERE booking_id = ?;

-- Verify transaction payment intent
SELECT payment_intent_id FROM transactions WHERE user_id = ?;

-- Check instructor permissions
SELECT i.id FROM instructors i WHERE i.user_id = ?;
```

**API Testing**:
```bash
# Test refund info endpoint
curl -H "Authorization: Bearer $TOKEN" \
     GET /api/admin/refunds/123/info

# Test refund processing
curl -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"bookingId":123,"refundType":"stripe"}' \
     POST /api/admin/refunds
```

## Future Enhancements

### Planned Features

1. **Partial Refunds**: Support for partial amount refunds
2. **Refund Webhooks**: Real-time Stripe webhook processing
3. **Refund Analytics**: Dashboard for refund metrics and trends
4. **Automated Policies**: Configurable refund rules and restrictions
5. **Refund Notifications**: Email notifications for refund processing

### Technical Debt

1. **Transaction Linking**: Improve booking-to-transaction relationship
2. **Stripe Webhook Integration**: Full webhook event processing
3. **Audit Logging**: Enhanced logging for compliance requirements
4. **Performance Optimization**: Caching for refund eligibility checks

---

*This documentation is maintained alongside the refund system implementation. For technical support or feature requests, please refer to the project's issue tracking system.*
