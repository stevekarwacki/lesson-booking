# Google Calendar Integration

## Overview

The Google Calendar integration blocks out instructor unavailability on the booking calendar by reading events from their Google Calendar. When an instructor has events on their Google Calendar, those time slots become unavailable for students to book.

The system supports two connection methods:
- **Service Account** (recommended): A shared Google service account reads instructor calendars. Instructors share their calendar with the service account email.
- **OAuth**: Instructors individually connect their Google accounts via OAuth 2.0 popup flow.

Administrators select the active method from **Admin Settings > Calendar Settings**. Only one method is active at a time.

## Architecture

### Configuration Flow

```
Admin Settings UI
    ↓
POST /api/admin/settings/calendar/method
POST /api/admin/settings/calendar/service-account
    ↓
AppSettings model (category: 'calendar')
    ↓
config/calendarConfig.js (DB-first, env fallback, 5-min cache)
    ↓
services/GoogleCalendarService.js
```

### Key Files

| File | Purpose |
|------|---------|
| `config/calendarConfig.js` | Loads calendar method and service account credentials from DB with env fallback |
| `services/GoogleCalendarService.js` | Core service: authenticates and fetches Google Calendar events |
| `routes/admin.js` | Admin API endpoints for calendar settings CRUD |
| `routes/auth.js` | Instructor endpoints for setup info, config, and connection test |
| `models/AppSettings.js` | Stores calendar settings (category: `'calendar'`) |
| `models/InstructorCalendarConfig.js` | Per-instructor calendar configuration (calendar ID, all-day handling) |
| `frontend/src/components/admin/CalendarSettingsSection.vue` | Admin UI container for calendar settings |
| `frontend/src/components/admin/CalendarMethodSettings.vue` | Method selector (OAuth / Service Account / Disabled) |
| `frontend/src/components/admin/ServiceAccountSettings.vue` | Service account credential CRUD |
| `frontend/src/components/admin/CalendarOAuthInfo.vue` | Read-only OAuth status and connected instructors |
| `frontend/src/components/GoogleCalendarSettings.vue` | Instructor-facing method-aware connection UI |
| `frontend/src/composables/useCalendarSettings.js` | Vue Query composable for admin calendar settings |
| `frontend/src/composables/useGoogleCalendar.js` | Vue Query composable for instructor calendar data |

## Admin Setup

### Selecting a Connection Method

1. Navigate to **Admin Settings > Calendar Settings**
2. Choose from the **Calendar Connection Method** dropdown:
   - **Service Account** (recommended) - shared service account reads all instructor calendars
   - **OAuth** - instructors connect individually via Google OAuth
   - **Disabled** - calendar integration is off

The selection is stored in `AppSettings` (key: `calendar.method`, category: `calendar`).

### Service Account Configuration

When "Service Account" is selected:

1. Create a Google Cloud project and enable the Google Calendar API
2. Create a service account in the Google Cloud Console
3. Generate a JSON key for the service account
4. In **Admin Settings > Calendar Settings**, enter:
   - **Service Account Email**: The `client_email` from the JSON key
   - **Private Key**: The `private_key` from the JSON key (stored encrypted with AES-256-GCM)
5. Save the configuration

The private key is encrypted using `utils/encryption.js` before storage in `AppSettings`.

### OAuth Configuration

OAuth credentials are shared with the email system and managed in **Admin Settings > Email Settings**. The Calendar Settings tab shows:
- Whether OAuth credentials are configured (read-only)
- Connected instructors and their connection status
- A link to Email Settings for credential management

Required OAuth scopes: `https://www.googleapis.com/auth/calendar.readonly`

See `/docs/GET_GOOGLE_OAUTH_CREDENTIALS.md` for detailed OAuth setup instructions.

## Instructor Setup

### Service Account Method

When the admin has selected Service Account:

1. Open the instructor's profile in the Manage Users modal > Availability tab
2. The **Google Calendar Integration** card shows:
   - The service account email to share the calendar with
   - Step-by-step sharing instructions
   - A Calendar ID input field
3. In Google Calendar:
   - Go to calendar Settings > Share with specific people
   - Add the service account email with "Make changes to events" permission
   - Copy the Calendar ID from "Integrate calendar" section
4. Paste the Calendar ID and click **Save Settings**
5. Use **Test Connection** to verify it works

### OAuth Method

When the admin has selected OAuth:

1. Open the instructor's profile in the Manage Users modal > Availability tab
2. Click **Connect with Google**
3. Complete the OAuth consent flow in the popup
4. Once connected, the card shows connection status, active scopes, and controls

### All-Day Event Handling

Both methods support configuring how all-day Google Calendar events are treated:
- **Ignore** (default): All-day events don't block any time slots
- **Block**: All-day events block the instructor's entire day

## Database Schema

### AppSettings (calendar category)

| Key | Value | Notes |
|-----|-------|-------|
| `calendar.method` | `oauth`, `service_account`, or `disabled` | Active connection method |
| `calendar.service_account_email` | Service account email | Plaintext |
| `calendar.service_account_private_key` | Encrypted private key | AES-256-GCM via `utils/encryption.js` |

### InstructorCalendarConfig

| Column | Type | Description |
|--------|------|-------------|
| `instructor_id` | INTEGER | FK to Instructor |
| `calendar_id` | STRING | Google Calendar ID (usually email) |
| `calendar_name` | STRING | Display name |
| `calendar_type` | ENUM | `personal` or `shared` |
| `all_day_event_handling` | ENUM | `ignore` or `block` |
| `is_active` | BOOLEAN | Whether sync is enabled |
| `last_tested_at` | DATE | Last connection test timestamp |
| `last_test_status` | STRING | `success` or `failed` |

## API Endpoints

### Admin Endpoints (require admin role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/settings/calendar/method` | Get current calendar method |
| POST | `/api/admin/settings/calendar/method` | Set calendar method |
| GET | `/api/admin/settings/calendar/service-account` | Get service account config (key masked) |
| POST | `/api/admin/settings/calendar/service-account` | Save service account credentials |
| DELETE | `/api/admin/settings/calendar/service-account` | Remove service account credentials |
| GET | `/api/admin/settings/calendar/connected-instructors` | List instructors with sync status |

### Instructor Endpoints (require instructor role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/calendar/setup-info/:id` | Get method-specific setup info |
| GET | `/api/auth/calendar/config/:id` | Get instructor's calendar config |
| POST | `/api/auth/calendar/config/:id` | Save/update calendar config |
| GET | `/api/auth/calendar/test/:id` | Test calendar connection |

### Setup Info Response Shape

Both methods return a standardized response:

```json
{
  "method": "service_account",
  "connection": {
    "available": true,
    "connected": true,
    "connectedAt": "2026-02-15T10:00:00Z",
    "message": "Calendar connected via service account."
  },
  "serviceAccountEmail": "sa@project.iam.gserviceaccount.com",
  "scopes": null
}
```

- `method`: The admin-configured method (`oauth`, `service_account`, `disabled`)
- `connection`: Unified status object used by both methods
- `serviceAccountEmail`: Present only for service account method
- `scopes`: Present only for OAuth method (connected instructors)

## Environment Variable Fallback

All calendar configuration is database-backed with environment variable fallback for backwards compatibility:

| Setting | DB Key | Env Var Fallback |
|---------|--------|-----------------|
| Connection method | `calendar.method` | `USE_OAUTH_CALENDAR` (true = oauth, false = service_account) |
| Service account email | `calendar.service_account_email` | `GOOGLE_SERVICE_ACCOUNT_EMAIL` |
| Service account key | `calendar.service_account_private_key` | `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` |

Database settings always take priority. Environment variables are only used when no database setting exists.

## Caching

`config/calendarConfig.js` implements a 5-minute in-memory cache for both the calendar method and service account credentials. The cache is automatically invalidated when settings are updated through the admin API.

`GoogleCalendarService.js` caches fetched calendar events for 5 minutes per instructor to reduce API calls to Google.

## Troubleshooting

### Service Account: "Calendar integration not available"
- Verify service account credentials are saved in Admin Settings > Calendar Settings
- Check that the service account email and private key are correct

### Service Account: Events not blocking time
- Verify the instructor shared their calendar with the service account email
- Ensure "Make changes to events" permission was granted (read access is sufficient but this is the standard share level)
- Use **Test Connection** to verify access
- Check the Calendar ID is correct (usually the instructor's email address)

### OAuth: "OAuth not configured on server"
- OAuth credentials are managed in Admin Settings > Email Settings
- Verify Client ID, Client Secret, and Redirect URI are configured
- See `/docs/GET_GOOGLE_OAUTH_CREDENTIALS.md` for setup instructions

### OAuth: Connection expires
- OAuth tokens can expire or be revoked
- The instructor needs to reconnect via the Connect with Google button
- The system gracefully handles expired tokens by returning empty events (no crash)
