# Duration-Specific Lesson System

## Overview

The lesson booking system supports both 30-minute and 60-minute lesson durations with duration-specific credits, automatic pricing, intelligent rescheduling, conflict detection, and admin-configurable settings.

## Lesson Durations

### Available Options
- **30-minute lessons**: Standard duration
- **60-minute lessons**: Extended duration for comprehensive sessions

### Pricing
- **30-minute lessons**: Instructor's base rate
- **60-minute lessons**: Exactly 2x the instructor's base rate
- **Example**: If instructor rate is $60, then 30-min = $60, 60-min = $120
- **Admin configurable**: Default lesson duration can be set by administrators

## Booking Process

### Duration Selection
1. Choose your preferred instructor
2. Select lesson duration (30 or 60 minutes)
3. Pick an available time slot
4. Complete payment or use credits

### Conflict Detection
The system automatically validates that your selected time slot is available for the full lesson duration:
- **30-minute lessons**: Checks single 30-minute slot
- **60-minute lessons**: Validates full 60-minute block is available
- **Real-time feedback**: Immediate notification if conflicts exist

## Rescheduling

### How It Works
- **Duration preservation**: Your lesson duration stays the same when rescheduling
- **Visual interface**: See your original time and new time side-by-side
- **Conflict prevention**: Cannot reschedule to your current booking time
- **Full validation**: System ensures new time slot accommodates your lesson duration

### Rescheduling Interface
- **Original Time** (blue box): Shows your current booking
- **New Time** (green box): Shows your selected new time
- **Duration locked**: Cannot change lesson duration during rescheduling

## Payment Options

### Direct Payment
- Pay per lesson using credit/debit card
- Automatic pricing based on selected duration
- Instant confirmation

### Duration-Specific Credit System
- **Separate credit types**: 30-minute and 60-minute credits are distinct
- **No credit conversion**: Cannot use 30-minute credits for 60-minute lessons or vice versa
- **Smart purchasing**: Buy specific lesson packages (e.g., "5 Pre-paid 60-Minute Lessons")
- **Real-time updates**: Credit balance updates immediately after purchases and bookings
- **Automatic application**: Credits are applied automatically during booking
- **Balance tracking**: View separate balances for each lesson duration
- **Expiry notifications**: Get notified when credits are approaching expiration

## Admin Features

### Lesson Settings Management
- **Default Duration Control**: Set the default lesson duration (30 or 60 minutes) for new bookings
- **Payment Plan Management**: Create and manage duration-specific lesson packages
- **Credit System Oversight**: Monitor credit usage and expiration across all users
- **Transaction Handling**: All credit operations use atomic database transactions for data integrity

### Admin Interface
- **Settings Panel**: Easy-to-use interface for configuring lesson defaults
- **Package Creation**: Create custom lesson packages with specific durations and pricing
- **Real-time Updates**: Changes take effect immediately across the platform

## User Interface Features

### Booking Modal
- Clear duration selection buttons
- Real-time price calculation
- Duration-specific credit display (e.g., "5 Pre-paid 60-Minute Lessons")
- Conflict warnings with specific guidance
- Payment method selection
- Immediate credit balance updates after booking

### Schedule View
- Color-coded time slots
- Multi-slot display for 60-minute bookings
- Availability indicators
- Click-to-book functionality

### Rescheduling Modal
- Side-by-side time comparison
- Interactive schedule grid
- Visual feedback for selections
- Confirmation before changes

## Technical Details

### Database Architecture
- **Duration-specific credits**: `user_credits` table includes `duration_minutes` field
- **Credit usage tracking**: `credit_usage` table records duration for audit purposes
- **Payment plan integration**: `payment_plans` table includes `lesson_duration_minutes`
- **Atomic transactions**: All credit operations use database transactions for consistency
- **Automated migrations**: Database schema updates are fully automated

### Time Slots
- System uses 15-minute time slots internally (4 slots = 60 minutes)
- 30-minute lessons = 2 slots
- 60-minute lessons = 4 consecutive slots
- All times displayed in user's local timezone

### Credit System Architecture
- **Validation layer**: Comprehensive parameter validation for all credit operations
- **Composable pattern**: Vue 3 composable for reactive credit state management
- **Real-time updates**: Automatic credit refresh after purchases and bookings
- **Error resilience**: Graceful handling of credit refresh failures

### Availability Calculation
- Checks instructor availability patterns
- Validates against existing bookings
- Accounts for full lesson duration
- Prevents overlapping appointments
- Real-time conflict detection for 60-minute lessons

### Error Handling
- Clear error messages for booking conflicts
- Specific guidance for resolution
- Graceful fallbacks for edge cases
- User-friendly notifications
- Comprehensive validation with descriptive error messages

## Best Practices

### For Students
- Book 60-minute lessons when you need extended practice time
- Check availability early for popular time slots
- Use rescheduling feature if your schedule changes
- Monitor credit balance for seamless booking

### For Instructors
- Set availability in 30-minute increments
- Consider offering both duration options
- Update rates to reflect your 30-minute lesson cost
- Review schedule regularly for optimal time management

## Troubleshooting

### Common Issues

**"Time slot unavailable for 60-minute lesson"**
- The selected time conflicts with existing bookings
- Try selecting an earlier time or choose 30-minute duration
- Check instructor's availability pattern

**"Pricing seems incorrect"**
- 60-minute lessons cost exactly double the 30-minute rate
- Contact support if calculations appear wrong
- Verify instructor's published rates

### Getting Help
- Check instructor availability patterns
- Review booking confirmation emails
- Contact support for payment or technical issues
- Use the rescheduling feature for schedule changes
