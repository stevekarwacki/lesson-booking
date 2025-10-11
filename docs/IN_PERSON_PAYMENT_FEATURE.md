# In-Person Payment Feature

## Overview

The In-Person Payment feature allows students to book lessons with payment to be collected in person, rather than through Stripe or lesson credits. This feature provides administrators and instructors with tools to manage and track outstanding payments.

## Key Features

### Global Configuration
- **Admin Control**: Admins can enable/disable in-person payments globally via the Lesson Settings
- **Default State**: Feature is disabled by default for new installations
- **Per-Student Override**: Individual students can have in-person payments enabled/disabled regardless of global setting

### Student Access Logic
Students can use in-person payment when:
- Global setting is ON **AND** student doesn't have it disabled, **OR**
- Global setting is OFF **AND** student has it enabled

### Payment Status Management
- **Outstanding Status**: In-person payments create transactions with "outstanding" status
- **Status Updates**: Instructors can mark their students' payments as "paid"
- **Admin Controls**: Admins can update payment status for all students
- **Visual Indicators**: Color-coded status display (yellow/red/green)

### Visual Status Indicators
- **Yellow**: Outstanding payment, no attendance marked
- **Red**: Outstanding payment, student marked as present (attended but not paid)
- **Green**: Payment received (completed status)

## Business Rules

### Payment Timeline
- Payment is due by the end of the lesson
- Outstanding payments are tracked until marked as paid

### Refund Integration
- In-person payments can be refunded as lesson credits
- Instructors and admins can process refunds
- "Mark as Paid" button is hidden for already refunded lessons

## Technical Implementation

### Database Schema

#### App Settings
```sql
-- Global setting in lessons category
INSERT INTO app_settings (category, key, value) 
VALUES ('lessons', 'in_person_payment_enabled', 'false');
```

#### User Model
```sql
-- Per-user override column
ALTER TABLE users ADD COLUMN in_person_payment_override 
ENUM('enabled', 'disabled') DEFAULT NULL;
```

#### Transactions Model
```sql
-- Updated enums to support in-person payments
ALTER TABLE transactions MODIFY COLUMN payment_method 
ENUM('stripe', 'credits', 'in-person') NOT NULL;

ALTER TABLE transactions MODIFY COLUMN status 
ENUM('pending', 'completed', 'failed', 'outstanding') NOT NULL;
```

### API Endpoints

#### Admin Configuration
- `PUT /api/admin/settings/lessons` - Update global in-person payment setting
- `PUT /api/admin/users/:id` - Update per-user override settings
- `PUT /api/admin/transactions/:id/payment-status` - Update payment status (admin)

#### User Access
- `GET /api/users/me/payment-options` - Check if user can use in-person payment

#### Payment Management
- `PUT /api/calendar/bookings/:id/payment-status` - Update payment status (instructor)

### Frontend Components

#### Admin Interface
- **LessonsSection.vue**: Global in-person payment toggle
- **UserManager.vue**: Per-user override controls

#### Student Interface
- **BookingModal.vue**: In-person payment option during booking
- **PaymentsPage.vue**: Outstanding payment history

#### Instructor Interface
- **BookingList.vue**: Payment status controls and visual indicators
- **InstructorCalendarPage.vue**: Payment status display

## Usage Guide

### For Administrators

#### Enabling In-Person Payments Globally
1. Navigate to Settings → Lessons
2. Toggle "Enable In-Person Payments" to ON
3. Save settings

#### Managing Per-Student Overrides
1. Navigate to User Management
2. Edit a user's profile
3. Set "In-Person Payment Override":
   - **Default**: Use global setting
   - **Enabled**: Allow in-person payment regardless of global setting
   - **Disabled**: Prevent in-person payment regardless of global setting

#### Managing Payment Status
1. View booking lists in any calendar view
2. For outstanding in-person payments, click "Mark as Paid"
3. Payment status updates immediately with visual confirmation

### For Instructors

#### Viewing Payment Status
- Outstanding in-person payments appear with colored indicators:
  - Yellow badge: Payment due, no attendance marked
  - Red badge: Payment due, student was present
  - Green badge: Payment received

#### Updating Payment Status
1. Locate booking with outstanding in-person payment
2. Click "Mark as Paid" button
3. Status updates to "completed" immediately

### For Students

#### Booking with In-Person Payment
1. Select lesson time and instructor
2. Choose "Pay In-Person" payment method (if available)
3. Complete booking
4. Payment will be collected during the lesson

#### Viewing Outstanding Payments
1. Navigate to Payments page
2. Outstanding in-person payments are listed with status
3. Payment history shows all in-person transactions

## Security & Permissions

### Authorization
- **Students**: Can only book lessons with in-person payment if eligible
- **Instructors**: Can update payment status for their own students' bookings
- **Admins**: Can update payment status for all bookings and manage global settings

### Validation
- Application-level validation ensures only valid payment methods and statuses
- Database constraints prevent invalid enum values
- Permission middleware enforces access controls

## Testing

### Unit Tests
- **Payment validation**: `tests/payment-validation.test.js`
- **Business logic**: `tests/in-person-payment-utils.test.js`
- **Settings validation**: `tests/app-settings-validation.test.js`

### Integration Tests
- Payment status update endpoints
- Booking workflow with in-person payment
- Permission enforcement

### Test Coverage
- User eligibility logic
- Payment status color coding
- Transaction creation and updates
- Frontend component behavior

## Migration Guide

### Database Migrations
1. `20250930000001-add-in-person-payment-support.js` - Adds core schema support
2. `20250930000002-remove-cash-payment-method.js` - Removes deprecated cash option

### Deployment Steps
1. Run database migrations: `npx sequelize-cli db:migrate`
2. Deploy application code
3. Configure global settings as needed
4. Train staff on new payment management features

## Troubleshooting

### Common Issues

#### "Mark as Paid" Button Not Visible
- Check if lesson has been refunded (button hidden for refunded lessons)
- Verify user has instructor/admin permissions
- Ensure payment method is "in-person" and status is "outstanding"

#### Students Can't See In-Person Payment Option
- Check global setting in Lesson Settings
- Verify user's override setting
- Confirm user eligibility with business logic

#### Payment Status Not Updating
- Check network connectivity
- Verify user permissions
- Review server logs for authorization errors

### Error Messages
- `"Error checking booking permissions"` - Authorization middleware issue
- `"Invalid payment method"` - Validation error, check enum values
- `"Booking not found"` - Invalid booking ID or access denied

## Future Enhancements

### Planned Features
- Bulk payment status updates
- Payment reminder notifications
- Enhanced reporting for outstanding payments
- Integration with point-of-sale systems

### Scalability Considerations
- Current implementation uses individual queries for payment enrichment
- Future optimization may include direct booking-transaction relationships
- Consider caching for frequently accessed payment status data

## Related Documentation
- [CASL Permissions Guide](CASL_PERMISSIONS_GUIDE.md)
- [Testing Guide](TESTING_GUIDE.md)
- [Refund System](REFUND_SYSTEM.md)
