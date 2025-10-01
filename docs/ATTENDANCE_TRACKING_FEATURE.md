# Attendance Tracking Feature

## Overview

Instructors and admins can record student attendance (present/absent/tardy) for lessons. When students are marked absent, they automatically receive an email notification with rebooking options.

## Key Components

### Database
- **Table**: `attendance` with one-to-one relationship to `calendar_events`
- **Statuses**: `present`, `absent`, `tardy`, or `null` (not recorded)
- **Fields**: `calendar_event_id`, `status`, `notes`, timestamps

### API Endpoint
- **POST** `/api/calendar/attendance`
- **Auth**: Uses existing `authorizeBooking('update')` middleware
- **Validation**: Lesson must have started before attendance can be marked
- **Side Effect**: Sends email if status is 'absent'

### Frontend
- **InstructorCalendarPage**: Shows instructor's bookings with attendance controls
- **BookingList**: Enhanced with attendance dropdown and status display
- **FilterTabs**: Added "Today" tab as default for quick access

### Email System
- **Template**: `/email-templates/contents/absence-notification.html`
- **Service**: `EmailService.sendAbsenceNotification()`
- **Trigger**: Automatic when student marked absent
- **Content**: Lesson details, instructor notes, rebooking CTA

## Technical Implementation

### Database Schema
```sql
CREATE TABLE attendance (
    id INTEGER PRIMARY KEY,
    calendar_event_id INTEGER UNIQUE NOT NULL,
    status ENUM('present', 'absent', 'tardy') DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (calendar_event_id) REFERENCES calendar_events(id)
);
```

### API Request/Response
```javascript
// POST /api/calendar/attendance
{
    "eventId": 123,
    "status": "absent", 
    "notes": "Optional instructor note"
}

// Response
{
    "success": true,
    "message": "Attendance recorded successfully",
    "attendance": {
        "status": "absent",
        "notes": "Optional instructor note", 
        "recorded_at": "2025-10-01T14:30:00Z"
    }
}
```

### Model Integration
```javascript
// In Calendar.getInstructorEvents() - includes attendance data
Calendar.hasOne(Attendance, { foreignKey: 'calendar_event_id' });

// In Attendance model - upsert method
Attendance.markAttendance = async function(eventId, status, notes) {
    return await this.upsert({ calendar_event_id: eventId, status, notes });
};
```

## Key Business Rules

### Time Validation
- Attendance can only be marked **after** lesson start time
- Past attendance records can be edited anytime (no time restrictions)
- Students cannot mark their own attendance

### Email Notifications
- **Trigger**: Only when status changed to 'absent'
- **Failure Handling**: Email errors don't prevent attendance recording
- **Content**: Includes lesson details, instructor notes, rebooking link

### Permissions
- **Instructors**: Can mark attendance for their own lessons
- **Admins**: Can mark attendance for any lesson  
- **Students**: Read-only access to their attendance records

## File Locations

### Backend Files
- **Migration**: `/migrations/20250929000001-create-attendance-table.js`
- **Model**: `/models/Attendance.js` 
- **API Route**: `/routes/calendar.js` (POST /attendance endpoint)
- **Email Service**: `/services/EmailService.js` (sendAbsenceNotification method)
- **Email Template**: `/email-templates/contents/absence-notification.html`

### Frontend Files  
- **Main Page**: `/frontend/src/views/InstructorCalendarPage.vue`
- **Component**: `/frontend/src/components/BookingList.vue` (enhanced with attendance)
- **Filters**: `/frontend/src/composables/useFiltering.js` (added "Today" tab)

## Testing

### Test Files
- **Backend**: `/tests/attendance.test.js` - Model, API, email integration tests
- **Frontend**: `/frontend/src/tests/attendance.test.js` - Component and UI tests

### Running Tests
```bash
# Backend tests
node tests/attendance.test.js

# Frontend tests  
cd frontend && npm run test attendance.test.js
```

## Usage

### Instructors
1. Go to `/instructor/calendar` 
2. Use "Today" tab to see current lessons
3. Mark attendance after lesson starts using dropdown (Present/Absent/Tardy)
4. Add optional notes
5. Students automatically get email if marked absent

### Common Issues
- **Controls not showing**: Lesson must have started first
- **Emails not sending**: Check `EMAIL_USER`/`EMAIL_APP_PASSWORD` env vars
- **Permission errors**: Verify instructor is assigned to the booking
