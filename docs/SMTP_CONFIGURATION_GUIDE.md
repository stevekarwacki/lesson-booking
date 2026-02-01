# SMTP Self-Service Configuration Guide

## Overview

Admins can configure SMTP email settings through the web interface without needing to modify environment variables or restart the server. SMTP credentials are encrypted at rest using AES-256-GCM encryption.

## Features

- **Self-Service Configuration**: Admins can set up SMTP through the UI
- **Secure Storage**: Passwords encrypted with AES-256-GCM before database storage
- **Connection Testing**: Test SMTP connection before saving
- **Database Priority**: Database config takes precedence over environment variables
- **Graceful Fallback**: Falls back to environment variables if database config not set

## Quick Start

### 1. Generate Encryption Key

First, generate a secure encryption key for storing SMTP passwords:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add this to your `.env` file:

```bash
ENCRYPTION_KEY=your_generated_64_character_hex_string_here
```

**IMPORTANT**: Keep this key secret and never commit it to version control. If you lose this key, you cannot decrypt existing SMTP passwords.

### 2. Configure SMTP via Admin UI

1. Log in as an admin user
2. Navigate to **Settings** → **Email Settings** tab
3. Click **Configure SMTP**
4. Fill in the form:
   - **SMTP Host**: Your email server hostname (e.g., `smtp.gmail.com`)
   - **Port**: Select from dropdown (465 for SSL, 587 for TLS)
   - **Use SSL/TLS**: Toggle on for secure connection (recommended)
   - **Username/Email**: Your SMTP username (usually your email)
   - **Password**: Your SMTP password or app-specific password
   - **From Name** (optional): Display name for outgoing emails
   - **From Address** (optional): Email address to use as sender
5. Click **Save Configuration**

### 3. Test Connection

After saving, click **Test Connection** to send a test email to your admin email address. This verifies:
- SMTP credentials are correct
- Server can connect to SMTP host
- Emails can be sent successfully

## Gmail Setup Example

### Using Gmail SMTP with App Password

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password
3. **Configure in Admin UI**:
   - Host: `smtp.gmail.com`
   - Port: `465`
   - SSL/TLS: Enabled
   - Username: `your-email@gmail.com`
   - Password: Your 16-character app password
   - From Name: `Your Business Name`
   - From Address: `your-email@gmail.com`

## Architecture

### Database Storage

SMTP settings are stored in the `app_settings` table under the `email` category:

| Key | Description | Encrypted |
|-----|-------------|-----------|
| `email_host` | SMTP server hostname | No |
| `email_port` | SMTP port number | No |
| `email_secure` | Use SSL/TLS (true/false) | No |
| `email_user` | SMTP username | No |
| `email_password` | SMTP password | **Yes** |
| `email_from_name` | Sender display name | No |
| `email_from_address` | Sender email address | No |

### Encryption Details

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: PBKDF2 with scrypt
- **Format**: `iv:authTag:encryptedData` (hex-encoded)
- **Key Source**: `ENCRYPTION_KEY` environment variable

### Provider Selection Logic

The `nodemailerProvider` uses this priority:

1. **Database Configuration** (if configured via admin UI)
2. **Environment Variables** (fallback for backward compatibility)
   - `EMAIL_USER`
   - `EMAIL_APP_PASSWORD`
   - `EMAIL_FROM`

## API Endpoints

### Admin Endpoints (Require Admin Auth)

#### Get SMTP Configuration
```http
GET /api/admin/settings/smtp
Authorization: Bearer <token>

Response:
{
  "email_host": "smtp.gmail.com",
  "email_port": 465,
  "email_secure": true,
  "email_user": "admin@example.com",
  "email_from_name": "My Business",
  "email_from_address": "admin@example.com",
  "is_configured": true,
  "has_password": true
}
```

#### Save SMTP Configuration
```http
POST /api/admin/settings/smtp
Authorization: Bearer <token>
Content-Type: application/json

{
  "email_host": "smtp.gmail.com",
  "email_port": 465,
  "email_secure": true,
  "email_user": "admin@example.com",
  "email_password": "your_app_password",
  "email_from_name": "My Business",
  "email_from_address": "admin@example.com"
}

Response:
{
  "success": true,
  "message": "SMTP configuration saved successfully",
  "config": { ... }
}
```

#### Test SMTP Connection
```http
POST /api/admin/settings/smtp/test
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipient_email": "admin@example.com"
}

Response:
{
  "success": true,
  "message": "Test email sent successfully to admin@example.com"
}
```

#### Delete SMTP Configuration
```http
DELETE /api/admin/settings/smtp
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "SMTP configuration deleted successfully"
}
```

## Frontend Components

### SMTPSettingsSection.vue

Located: `/frontend/src/components/admin/SMTPSettingsSection.vue`

**Features:**
- Displays current SMTP configuration status
- Edit/create SMTP configuration form
- Password visibility toggle
- Test connection functionality
- Delete configuration with confirmation
- Validation error display
- Loading states for all operations

**Uses shadcn-vue components:**
- `Card` - Visual grouping
- `Input` - Text/email/password fields
- `Select` - Port dropdown
- `Switch` - SSL/TLS toggle
- `Button` - Actions
- `Label` - Form labels

### Integration

The SMTP settings are integrated into `EmailTemplatesSection.vue`, appearing above the email templates list in the "Email Settings" tab of Admin Settings.

## Vue Query Integration

### Composable: useEmailSettings

Located: `/frontend/src/composables/useEmailSettings.js`

**Provides:**
- `smtpConfig` - Current SMTP configuration
- `isSMTPConfigured` - Boolean computed
- `saveSMTPConfig(config)` - Save configuration
- `deleteSMTPConfig()` - Delete configuration
- `testSMTPConnection(email)` - Test connection
- Loading states for all operations

**Cache Strategy:**
- Stale time: 5 minutes
- Cache time: 30 minutes
- Admin-only queries
- Auto-invalidation after mutations

## Validation

### Zod Schema

Located: `/common/schemas/smtp.schema.mjs`

**Validates:**
- Host: Valid hostname format
- Port: Integer between 1-65535
- Secure: Boolean
- User: Required, valid email
- Password: Required, max 500 chars
- From Name: Optional, max 100 chars
- From Address: Optional, valid email

Shared between frontend and backend for consistent validation.

## Security Considerations

### Password Storage
- Passwords encrypted before database storage
- AES-256-GCM provides confidentiality and integrity
- Unique IV (initialization vector) for each encryption
- Authentication tag prevents tampering

### Access Control
- Configuration endpoints require admin authentication
- Passwords never returned in API responses
- Test emails only sent to admin's own email address

### Key Management
- Encryption key stored in environment variable
- Key never exposed in code or API responses
- If key is lost, existing passwords cannot be decrypted
- Key rotation requires re-encrypting all passwords

### Network Security
- Always use SSL/TLS for SMTP (port 465 or 587)
- Avoid port 25 (unencrypted)
- Use app-specific passwords for Gmail (not account password)

## Troubleshooting

### "Encryption failed: ENCRYPTION_KEY environment variable is required"

**Cause**: `ENCRYPTION_KEY` not set in environment

**Solution**: 
```bash
# Generate a key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
ENCRYPTION_KEY=your_generated_key_here
```

### "SMTP connection test failed: Authentication failed"

**Causes**:
- Incorrect username/password
- Using Gmail without app-specific password
- 2FA enabled but using regular password

**Solutions**:
- Verify credentials are correct
- For Gmail, generate and use an app password
- Check SMTP provider documentation

### "SMTP connection test failed: Connection failed"

**Causes**:
- Incorrect host or port
- Firewall blocking outbound connections
- SMTP server not accessible

**Solutions**:
- Verify host and port are correct
- Check firewall rules
- Test connection from command line: `telnet smtp.gmail.com 465`

### "Test email sent but not received"

**Causes**:
- Email in spam folder
- From address blocked by recipient server
- Domain not verified with SMTP provider

**Solutions**:
- Check spam/junk folder
- Verify from address matches SMTP account
- Set up SPF/DKIM records for your domain

## Migration from Environment Variables

If you have existing `EMAIL_USER` and `EMAIL_APP_PASSWORD` environment variables:

1. They will continue to work as a fallback
2. Configure SMTP via admin UI to override them
3. Database configuration takes priority over environment variables
4. You can safely remove environment variables after database config is set

## Testing

### Manual Testing Checklist

- [ ] Generate encryption key and set `ENCRYPTION_KEY`
- [ ] Configure SMTP via admin UI
- [ ] Test connection sends email successfully
- [ ] Edit configuration and save
- [ ] Delete configuration and verify fallback
- [ ] Test email sending after reconfiguration
- [ ] Verify passwords are encrypted in database

### Automated Tests

See `/tests/smtp-configuration.test.js` for:
- Encryption/decryption utilities
- API route validation
- Provider initialization
- Vue Query composable

## Environment Variables Reference

### Required for SMTP Self-Service

```bash
# Required: Encryption key for storing SMTP passwords
ENCRYPTION_KEY=64_character_hex_string_here
```

### Optional: Fallback SMTP (Legacy)

```bash
# Optional: Traditional environment variable configuration (fallback)
EMAIL_USER=your-email@example.com
EMAIL_APP_PASSWORD=your_app_password
EMAIL_FROM="Your Business" <your-email@example.com>
```

## Related Documentation

- [Email Template Management](./EMAIL_TEMPLATE_MANAGEMENT_RESEARCH.md)
- [System Email OAuth Feature](./SYSTEM_EMAIL_OAUTH_FEATURE.md) (Alternative approach)
- [Zod Integration Guide](./ZOD_INTEGRATION_GUIDE.md)
- [Vue Query Pattern](./VUE_QUERY_PATTERN.md)

## Future Enhancements

Potential improvements for future versions:

- Multiple SMTP accounts with load balancing
- SMTP connection health monitoring
- Email sending analytics dashboard
- Auto-rotation of encryption keys
- Support for additional email providers (SendGrid, Mailgun, etc.)
