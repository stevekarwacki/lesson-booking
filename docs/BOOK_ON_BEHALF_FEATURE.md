# Book on Behalf Feature

## Overview

The Book on Behalf feature enables administrators and instructors to book lessons for students directly. This streamlines the booking process when students need assistance or when instructors want to proactively schedule lessons.

## Key Features

### Permission-Based Access
- **Instructors**: Can book lessons for any student
- **Admins**: Can book lessons for any student
- **Students**: Cannot book on behalf of others

### Student Selection
- **Search Interface**: Real-time search by student name or email
- **Required Selection**: Must select a student before proceeding with booking
- **Credit Display**: Automatically fetches and displays selected student's available credits

### Payment Method Control
- **Default Method**: In-person payment selected by default when booking on behalf
- **Credit Detection**: Automatically shows credit option if student has available credits
- **Card Payment**: Configurable via admin settings (disabled by default for security)

### UI Safeguards
- **Hidden Payment Forms**: Payment selection hidden until student is selected
- **Disabled Confirm Button**: Button disabled with "Select Student" text until student chosen
- **Error Feedback**: Clear error messages if API calls fail

## Business Rules

### Who Can Book
- Only admins and instructors can access book on behalf functionality
- Book on behalf is triggered when clicking available slots on the calendar
- Regular student bookings remain unchanged

### Payment Defaults
- **In-person payment** is the default method (safest for proxy bookings)
- **Credits** are automatically offered if the selected student has any
- **Card payment** requires explicit admin configuration to enable

### Security Considerations
- Card payment on behalf is **disabled by default**
- Prevents accidental charges to instructor/admin cards
- Can be enabled via Lesson Settings if business requires it

## Technical Implementation

### CASL Permissions

#### New Permission Subjects
```javascript
// Instructors and admins can:
can('read', 'StudentList')      // View list of students
can('read', 'StudentCredits')   // View student credit balances
```

#### Permission Implementation
```javascript
// Backend: utils/abilities.js
if (user.role === 'instructor') {
  can('read', 'StudentList');
  can('read', 'StudentCredits');
}

// Frontend: frontend/src/utils/abilities.js
// (mirrors backend)
```

### API Endpoints

#### Student Data Access
```
GET /api/users/students
Authorization: Required (instructor or admin)
Response: { users: [{ id, name, email, role }] }
```

#### Student Credit Balance
```
GET /api/users/:userId/credits?duration=30
Authorization: Required (instructor or admin)
Response: { availableCredits: number, duration: number }
```

#### Lesson Settings (Public Read)
```
GET /api/branding/lesson-settings
Authorization: Optional
Response: {
  default_duration_minutes: number,
  card_payment_on_behalf_enabled: boolean
}
```

#### Booking Endpoint (Enhanced)
```
POST /api/calendar/addEvent
Body: {
  instructorId: number,
  startTime: string,
  endTime: string,
  paymentMethod: string,
  studentId?: number  // Optional: for booking on behalf
}
```

### Database Schema

#### App Settings
```sql
-- Card payment on behalf setting
INSERT INTO app_settings (category, key, value, updated_by) 
VALUES ('lessons', 'card_payment_on_behalf_enabled', 'false', admin_user_id);
```

#### No Schema Changes Required
- Uses existing `calendar_events` table
- `student_id` column already supports any student
- No new tables needed

### Middleware

#### New Authorization Helper
```javascript
// middleware/permissions.js
const authorizeAny = (permissions) => {
  // Allows access if user has ANY of the specified permissions
  // Used for endpoints accessible by multiple roles
}
```

#### Usage Example
```javascript
router.get('/students', authorizeAny([
  { action: 'read', subject: 'StudentList' },
  { action: 'manage', subject: 'User' }
]), async (req, res) => {
  // Route handler
});
```

### Frontend Components

#### BookingModal.vue (Enhanced)
**New Props:**
- `slot.bookingOnBehalf` - Boolean flag indicating book on behalf mode

**New State:**
- `allStudents` - List of all students from API
- `selectedStudent` - Currently selected student object
- `studentSearchQuery` - Search input value
- `selectedStudentCredits` - Selected student's available credits
- `cardPaymentOnBehalfEnabled` - Admin setting for card payments

**New Computed Properties:**
- `isBookingOnBehalf` - Detects if modal is in book on behalf mode
- `showCardPaymentOption` - Controls card payment visibility
- `isConfirmDisabled` - Disables confirm until student selected
- `searchResults` - Filtered student list based on query

**New Methods:**
- `fetchAllStudents()` - Loads student list on mount
- `handleStudentSelect(student)` - Processes student selection
- `fetchStudentCredits(studentId)` - Loads student's credit balance
- `updatePaymentMethodForBookingOnBehalf()` - Sets default payment method

#### InstructorCalendar.vue (Enhanced)
**Modified Behavior:**
- Clicking available slots now opens booking modal with `bookingOnBehalf: true`
- Both admins and instructors can trigger book on behalf

#### DailyScheduleColumn.vue (Modified)
**Event Emission:**
- Removed instructor-only restriction on available slot clicks
- Now emits `@slot-selected` for all users with calendar access

#### LessonsSection.vue (Enhanced)
**New Settings Section:**
- "Payment Methods" header groups payment-related settings
- "Allow Card Payment in Order-on-Behalf-Of" checkbox
- Disabled by default for security

## Configuration

### Enabling Card Payment on Behalf

1. Navigate to **Settings → Lesson Settings**
2. Locate "Payment Methods" section
3. Check "Allow Card Payment in Order-on-Behalf-Of"
4. Click "Save Lesson Settings"

**Security Note:** Only enable if your business requires card payments for proxy bookings. In-person and credit payments are safer defaults.

## Usage Guide

### For Instructors

#### Booking a Lesson for a Student

1. Navigate to **Calendar**
2. Click any **available time slot** (shown in white/gray)
3. Modal opens in "Book on Behalf" mode
4. **Search for student:**
   - Type student name or email in search field
   - Results filter in real-time
   - Click student to select
5. **Review booking details:**
   - Date, time, and duration are pre-filled
   - Payment method defaults to "In-person"
   - If student has credits, "Use Credits" option appears
6. **Select payment method** (after student selection)
7. Click **"Confirm Booking"**

#### Payment Method Selection

**In-person (Default)**
- Student will pay at lesson time
- Creates "outstanding" payment status
- Mark as paid after lesson via Booking List

**Use Credits (If Available)**
- Automatically shown if student has credits for the selected duration
- Deducts 1 credit immediately upon booking
- No outstanding payment needed

**Card Payment (If Enabled)**
- Only visible if admin has enabled it in settings
- Charges the booking instructor/admin (use carefully!)
- Creates completed payment immediately

### For Administrators

#### Managing Book on Behalf Settings

1. **Enable/Disable Card Payments:**
   - Go to **Settings → Lesson Settings**
   - Toggle "Allow Card Payment in Order-on-Behalf-Of"
   - Save changes

2. **Monitor Bookings:**
   - Book on behalf bookings appear in calendar like normal bookings
   - Track via **Users** page → Select student → Bookings tab

3. **Process Refunds:**
   - Book on behalf bookings can be refunded like any other booking
   - Credits restored to student account (if paid with credits)

## Error Handling

### Frontend Errors

**Failed to Load Students**
- Error Message: "Unable to load student list. Please try again."
- Cause: Network error or permission issue
- Resolution: Refresh page, check internet connection

**Failed to Load Student Credits**
- Error Message: "Unable to load student credit balance."
- Cause: API error or network issue
- Resolution: Student credits default to 0, can still book with other payment methods

**Insufficient Credits**
- Error Message: "INSUFFICIENT_CREDITS"
- Cause: Student doesn't have enough credits for selected duration
- Resolution: Choose different payment method (in-person or card if enabled)

### Backend Errors

**403 Forbidden**
- Cause: User doesn't have required permissions
- Check: Verify user role is instructor or admin

**404 Not Found**
- Cause: Student ID doesn't exist or settings not configured
- Check: Ensure student exists in system

**500 Internal Server Error**
- Cause: Database error or server issue
- Check: Server logs for detailed error information

## Security Considerations

### Permission Checks
- All book on behalf endpoints require authentication
- Role verification on both frontend and backend
- CASL permissions enforced at API level

### Default Security Stance
- Card payment **disabled by default**
- Prevents accidental charges to wrong accounts
- In-person payment is safest default

### Audit Trail
- All bookings logged with creator's user ID
- Can trace who booked on whose behalf
- Payment method recorded in transaction

### Data Access
- Instructors can only see student list (names/emails)
- Cannot see sensitive student data (passwords, payment history)
- Credit balances visible only for booking purposes

## Future Enhancements

### Potential Improvements
- [ ] Filter students by "has booked with this instructor"
- [ ] Show student's booking history in selector
- [ ] Add "recent students" quick access
- [ ] Bulk booking for multiple students
- [ ] Recurring bookings on behalf
- [ ] Email notification to student when booked on their behalf

### Related Features
- **In-Person Payment**: How to handle outstanding payments
- **Refund System**: Refunding book on behalf bookings
- **Attendance Tracking**: Marking presence for proxy bookings
- **User Management**: Managing student accounts

## Troubleshooting

### Student Search Not Working
**Symptom:** No results when typing in search field

**Solutions:**
1. Check that students exist in the system (Users page)
2. Verify search is case-insensitive
3. Try searching by email instead of name
4. Refresh page and try again

### Cannot See Available Slots
**Symptom:** No slots are clickable on calendar

**Solutions:**
1. Verify you're logged in as instructor or admin
2. Check that availability has been configured
3. Ensure instructor has slots marked as available

### Payment Method Missing
**Symptom:** Expected payment option not showing

**Solutions:**
1. **Card payment missing:** Check Lesson Settings → "Allow Card Payment in Order-on-Behalf-Of"
2. **Credits not showing:** Selected student may not have credits for that duration
3. **In-person missing:** Should always show; check for JavaScript errors

### Booking Fails After Student Selection
**Symptom:** Error when clicking "Confirm Booking"

**Solutions:**
1. Check browser console for specific error
2. Verify selected time slot is still available
3. Ensure student is not already booked at that time
4. Check for time conflicts or validation errors

## Related Documentation

- [CASL Permissions Guide](CASL_PERMISSIONS_GUIDE.md) - Permission system details
- [In-Person Payment Feature](IN_PERSON_PAYMENT_FEATURE.md) - Payment method details
- [Refund System](REFUND_SYSTEM.md) - Refund workflows
- [Testing Guide](TESTING_GUIDE.md) - Testing methodology
- [User Management Flow](USER_MANAGEMENT_FLOW.md) - User administration

