# Business Hours Availability Feature

## Overview

The Business Hours Availability feature allows administrators to configure global operating hours for the business. These hours automatically constrain instructor availability settings, ensuring instructors can only set their availability within the business's operating hours.

**Key Benefits:**
- Centralized control of business operating hours
- Automatic enforcement across all instructor schedules
- Prevents scheduling conflicts outside business hours
- Handles legacy data gracefully
- Different hours per day (e.g., open late on Thursdays)
- Closed days support

## Architecture

### Backend Components

#### 1. Configuration Storage (`/config/defaults.json`)

Default business hours configuration:

```json
{
  "business": {
    "businessHours": {
      "monday": { "isOpen": true, "open": "09:00", "close": "17:00" },
      "tuesday": { "isOpen": true, "open": "09:00", "close": "17:00" },
      "wednesday": { "isOpen": true, "open": "09:00", "close": "17:00" },
      "thursday": { "isOpen": true, "open": "09:00", "close": "17:00" },
      "friday": { "isOpen": true, "open": "09:00", "close": "17:00" },
      "saturday": { "isOpen": false, "open": "09:00", "close": "17:00" },
      "sunday": { "isOpen": false, "open": "09:00", "close": "17:00" }
    }
  }
}
```

**Purpose:** Centralized fallback values to avoid hardcoding defaults throughout the codebase.

#### 2. Database Model (`/models/AppSettings.js`)

**Static Method: `getBusinessHours()`**
```javascript
static async getBusinessHours() {
  const setting = await AppSettings.findOne({
    where: { category: 'business', key: 'business_hours' }
  });
  
  if (setting?.value) {
    return JSON.parse(setting.value);
  }
  
  return defaults.business.businessHours;
}
```

**Validation Method: `validateBusinessSetting(key, value)`**

Validates business hours configuration:
- JSON structure with all 7 days
- `isOpen` boolean for each day
- `open` and `close` times in HH:MM format (00:00 - 23:59)
- `open` time must be before `close` time
- Supports 24-hour operation (00:00 - 23:59)

#### 3. Time Utilities (`/utils/timeUtils.js`)

**`parseTimeToHours(timeStr)`**
- Internal helper for time comparison
- Converts HH:MM string to decimal hours
- Example: "14:30" → 14.5
- **Note:** Only used internally for business hours validation; the UI uses slot numbers (0-95)

**`validateSlotAgainstBusinessHours(dayOfWeek, startTime, endTime, businessHours)`**
- Validates instructor availability slots against business hours
- Parameters:
  - `dayOfWeek`: 0=Sunday, 1=Monday, ..., 6=Saturday
  - `startTime`: HH:MM format
  - `endTime`: HH:MM format
  - `businessHours`: Configuration object
- Returns: `{ valid: boolean, error?: string, dayName?: string, dayConfig?: object }`

**Usage Example:**
```javascript
const result = validateSlotAgainstBusinessHours(
  1, // Monday
  '09:00',
  '12:00',
  businessHours
);

if (!result.valid) {
  console.error(result.error);
  // "Time slot (09:00-12:00) is outside business hours for monday (10:00-18:00)"
}
```

#### 4. API Endpoints (`/routes/admin.js`)

**GET `/api/admin/settings`**
- Returns all settings including `businessHours`
- Falls back to defaults if not configured

**PUT `/api/admin/settings/business`**
- Updates business settings including `businessHours`
- Validates configuration before saving
- Returns 400 with detailed error messages on validation failure

#### 5. Instructor Availability Routes (`/routes/instructorAvailability.js`)

**POST `/api/availability/:instructorId/weekly`**

Validates each submitted availability slot:
```javascript
// Fetch current business hours
const businessHours = await AppSettings.getBusinessHours();

// Validate each slot
for (const slot of slots) {
  const validation = validateSlotAgainstBusinessHours(
    slot.dayOfWeek,
    slot.startTime,
    slot.endTime,
    businessHours
  );
  
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
}
```

**Error Responses:**
- `400`: "Business is closed on wednesday"
- `400`: "Time slot (08:00-09:00) is outside business hours for monday (09:00-17:00)"

#### 6. Model Loading (`/models/InstructorAvailability.js`)

**`getWeeklyAvailability(instructorId)`**

Filters legacy data on load:
```javascript
const businessHours = await AppSettings.getBusinessHours();

// Filter out slots outside current business hours
const validAvailability = dbAvailability.filter(slot => {
  const validation = validateSlotAgainstBusinessHours(
    slot.day_of_week,
    slot.local_start_time,
    slot.local_end_time,
    businessHours
  );
  return validation.valid;
});
```

**Purpose:** Prevents displaying or attempting to save invalid legacy data when business hours are changed.

### Frontend Components

#### 1. Settings Composable (`/frontend/src/composables/useAppSettings.js`)

**TanStack Query Integration:**
```javascript
export function useAppSettings() {
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => fetchAppSettings(userStore.token),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
  
  const businessHours = computed(() => settings.value?.businessHours || null);
  const earliestOpenTime = computed(() => getEarliestOpenTime(businessHours.value));
  const latestCloseTime = computed(() => getLatestCloseTime(businessHours.value));
  
  const isSlotWithinHours = (dayOfWeek, slotTime) => {
    return isWithinBusinessHours(businessHours.value, dayOfWeek, slotTime);
  };
  
  return {
    settings,
    businessHours,
    earliestOpenTime,
    latestCloseTime,
    isSlotWithinHours,
    isLoading,
    error
  };
}
```

**Helper Functions:**

- **`earliestOpenTime`**: Returns the earliest opening time across all days (used for time grid rendering)
- **`latestCloseTime`**: Returns the latest closing time across all days
- **`isSlotWithinHours(dayOfWeek, slotTime)`**: Validates if a specific time slot is within business hours for a given day

#### 2. Instructor Availability View (`/frontend/src/components/InstructorAvailabilityView.vue`)

**Dynamic Time Grid:**
```javascript
const { businessHours, earliestOpenTime, latestCloseTime, isSlotWithinHours } = useAppSettings();

const timeSlots = computed(() => {
  const slots = [];
  const start = earliestOpenTime.value;
  const end = latestCloseTime.value;
  
  // Generate slots from business hours range
  for (let hour = start; hour < end; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      slots.push(hour * 4 + minute / 15); // Slot number (0-95)
    }
  }
  
  return slots;
});
```

**Frontend Validation:**
```javascript
function toggleTimeSlot(day, slot) {
  // Convert slot to decimal hours for validation
  const slotHour = Math.floor(slot / 4);
  const slotMinute = (slot % 4) * 15;
  const slotTime = slotHour + (slotMinute / 60);
  
  if (!isSlotWithinHours(day, slotTime)) {
    return; // Prevent selection
  }
  
  // Toggle availability...
}
```

**Visual Indicators:**
```vue
<div
  :class="{
    'available': isTimeAvailable(day, slot),
    'outside-business-hours': !isSlotInBusinessHours(day, slot),
    'cursor-not-allowed': !isSlotInBusinessHours(day, slot)
  }"
  :title="getBlockedReason(day, slot)"
>
```

**CSS:**
```css
.outside-business-hours {
  background-color: #f5f5f5;
  opacity: 0.5;
  pointer-events: none;
}

.cursor-not-allowed {
  cursor: not-allowed;
}
```

#### 3. Admin Settings Page (`/frontend/src/views/AdminSettingsPage.vue`)

**Cache Invalidation:**
```javascript
import { useQueryClient } from '@tanstack/vue-query';

const queryClient = useQueryClient();

async function saveBusinessSettings() {
  // Save to API...
  
  // Invalidate cache to force refetch
  await queryClient.invalidateQueries({ queryKey: ['appSettings'] });
  
  showSuccess('Settings saved successfully');
}
```

**Purpose:** Ensures all components using `useAppSettings()` immediately reflect updated business hours.

#### 4. Calendar Components

**`WeeklyScheduleView.vue` and `DailyScheduleView.vue`:**

Both components use business hours to generate time labels and transform schedule data:

```javascript
const { earliestOpenTime, latestCloseTime } = useAppSettings();

const timeLabels = computed(() => {
  return generateTimeLabels(
    Math.floor(earliestOpenTime.value),
    Math.ceil(latestCloseTime.value)
  );
});

const weeklyColumns = computed(() => {
  const earliestOpenSlot = earliestOpenTime.value * 4;
  const latestCloseSlot = latestCloseTime.value * 4;
  
  return transformWeeklySchedule(
    props.schedule,
    props.startDate,
    earliestOpenSlot,
    latestCloseSlot
  );
});
```

## Configuration Workflow

### 1. Admin Configuration

1. Navigate to **Admin Settings** → **Business Information**
2. Configure business hours for each day:
   - Toggle "Open" checkbox
   - Set opening time (HH:MM)
   - Set closing time (HH:MM)
3. Click **Save**
4. System validates:
   - All 7 days configured
   - Valid time format
   - Open before close
5. Cache invalidates → all UIs update immediately

### 2. Instructor Availability

1. Instructor navigates to **Availability** settings
2. Time grid automatically adjusts to business hours range
3. Slots outside business hours are:
   - Grayed out
   - Non-clickable
   - Show tooltip: "Outside business hours"
4. Attempt to save invalid slots → **Frontend:** Selection prevented
5. If frontend bypassed → **Backend:** 400 error with specific message

### 3. Legacy Data Handling

**Scenario:** Business hours change from 6am-10pm to 9am-5pm

**On Next Load:**
```javascript
// Before: Instructor has 7am-8am availability
// After: This slot is filtered out on load
const validAvailability = dbAvailability.filter(slot => {
  return validateSlotAgainstBusinessHours(...).valid;
});
// Instructor no longer sees 7am-8am slot
```

**Benefits:**
- No manual cleanup required
- No invalid data displayed
- Instructor can set new availability within new hours

## Data Flow

### Setting Business Hours

```
Admin UI
  ↓ PUT /api/admin/settings/business
AppSettings.validateBusinessSetting()
  ↓ Validation passes
Database (app_settings table)
  ↓ 200 OK
queryClient.invalidateQueries(['appSettings'])
  ↓
All components using useAppSettings() refetch
  ↓
UI updates immediately
```

### Setting Instructor Availability

```
Instructor UI
  ↓ Selects time slot
Frontend: isSlotWithinHours() validation
  ↓ Valid
  ↓ POST /api/availability/:id/weekly
Backend: validateSlotAgainstBusinessHours()
  ↓ Valid
Database (instructor_availability table)
  ↓ 200 OK
Success toast notification
```

### Loading Instructor Availability

```
Frontend: GET /api/availability/:id/weekly
  ↓
InstructorAvailability.getWeeklyAvailability()
  ↓
AppSettings.getBusinessHours()
  ↓
Filter slots outside business hours
  ↓
Return valid slots only
  ↓
Frontend displays filtered availability
```

## Testing

### Frontend Tests (`/frontend/src/tests/useAppSettings.test.js`)

**Coverage:**
- Business hours fetching with defaults
- `earliestOpenTime` and `latestCloseTime` computation
- `isSlotWithinHours` validation function
- Error handling and fallback behavior
- Composable API surface

**Run:**
```bash
cd frontend && npm run test -- useAppSettings.test.js
```

### Backend Tests (`/tests/business-hours-availability.test.js`)

**Coverage:**
- Business hours validation (format, logic, 24-hour operation)
- Slot validation against business hours
- Different hours per day
- Closed days handling
- Edge cases (opening time, closing time)
- Business hours retrieval with defaults

**Run:**
```bash
NODE_ENV=test node --test tests/business-hours-availability.test.js
```

## Edge Cases & Considerations

### 1. 24-Hour Operation

**Supported:**
```json
{
  "monday": { "isOpen": true, "open": "00:00", "close": "23:59" }
}
```

### 2. Different Hours Per Day

**Supported:**
```json
{
  "monday": { "isOpen": true, "open": "09:00", "close": "17:00" },
  "thursday": { "isOpen": true, "open": "09:00", "close": "21:00" }
}
```

### 3. Closed Days

**Supported:**
```json
{
  "sunday": { "isOpen": false, "open": "09:00", "close": "17:00" }
}
```

**Behavior:** Instructors cannot set availability on closed days.

### 4. Time Zone Handling

- Business hours stored in HH:MM format (timezone-agnostic)
- Applied in instructor's local timezone
- All comparisons done in local time
- No cross-timezone conversion needed for validation

### 5. Legacy Data Migration

**No database migration required:**
- Old availability records remain in database
- Filtered on load if outside current business hours
- No data loss
- Reversible (widen hours → old data reappears)

### 6. Slot Alignment

**Critical:** Business hours validation uses decimal hours, but the slot system uses integers (0-95).

**Conversion:**
- Slot 36 = 9:00 AM (36 ÷ 4 = 9)
- Slot 68 = 5:00 PM (68 ÷ 4 = 17)
- Validation converts both to decimal for comparison

## Performance Considerations

### 1. Caching Strategy

**TanStack Query Configuration:**
- `staleTime: 5 minutes` - Business hours rarely change
- `cacheTime: 30 minutes` - Keep in memory longer
- Manual invalidation on admin save

**Benefit:** Minimal API calls, instant UI updates after changes

### 2. Frontend Validation

**Why validate on frontend?**
- Prevents invalid API calls
- Instant feedback
- Better UX

**Security:** Backend validation always runs (never trust client)

### 3. Database Queries

**`getBusinessHours()` is called:**
- Admin settings load (cached)
- Instructor availability save (validation)
- Instructor availability load (filtering)

**Optimization:** Consider Redis caching for high-traffic scenarios

## Troubleshooting

### Issue: "Availability not saving"

**Check:**
1. Are you within business hours? (Frontend should prevent selection)
2. Browser console for validation errors
3. Network tab for 400 errors with specific messages

### Issue: "Time grid not showing full range"

**Check:**
1. Business hours configured correctly?
2. `earliestOpenTime` and `latestCloseTime` computed correctly?
3. Browser console for errors in `useAppSettings()`

### Issue: "Legacy availability disappeared"

**Expected behavior:**
- When business hours change, old availability outside new hours is filtered
- Data still in database, just not displayed
- Widen hours to see it again

### Issue: "Changes not reflecting immediately"

**Solution:**
1. Check `invalidateQueries` is called after save
2. Check `queryKey: ['appSettings']` matches across app
3. Clear browser cache if stuck

## Future Enhancements

### Potential Improvements

1. **Holiday/Exception Days**: Special hours for specific dates
2. **Seasonal Hours**: Different hours for summer/winter
3. **Multi-Location Support**: Different hours per location
4. **Break Times**: Configurable lunch breaks, closed hours within a day
5. **Recurring Patterns**: Templates for common schedules
6. **Time Zone Display**: Show hours in different timezones for multi-region businesses

### Migration Path

All enhancements would build on existing structure:
- Additional fields in `business_hours` JSON
- Extended validation in `validateBusinessSetting()`
- Enhanced `isSlotWithinHours()` logic
- Backward compatible with current implementation

## Related Documentation

- [Testing Guide](./TESTING_GUIDE.md) - Comprehensive testing documentation
- [Vue Query Pattern](./VUE_QUERY_PATTERN.md) - TanStack Query usage patterns
- [Toast Notifications](./TOAST_NOTIFICATIONS.md) - User feedback system
- [Business Information Feature](./BUSINESS_INFORMATION_FEATURE.md) - Related admin settings
- [Date Helpers System](./DATE_HELPERS_SYSTEM.md) - Date/time utilities

## Summary

The Business Hours Availability feature provides:
- ✅ Centralized business hours configuration
- ✅ Automatic enforcement across all instructors
- ✅ Graceful legacy data handling
- ✅ Frontend and backend validation
- ✅ Real-time UI updates
- ✅ Comprehensive test coverage
- ✅ Flexible configuration (per-day hours, closed days)
- ✅ Production-ready with proper error handling
