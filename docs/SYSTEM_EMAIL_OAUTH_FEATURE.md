# System Email OAuth Feature - Design Document

## Executive Summary

Currently, the application supports Gmail OAuth only for instructor-specific emails, while system emails (purchase confirmations, credit notifications, etc.) are hardcoded to use Nodemailer. This creates issues when Nodemailer is not configured, causing system emails to fail silently.

This document outlines a comprehensive solution that introduces a **system-level Gmail OAuth account** for all emails by default, with optional **per-instructor override** capability.

## Current Architecture

### Email Provider Selection Logic

Current flow (`services/email/emailConfig.js`):

```javascript
PROVIDER_RULES = [
    {
        name: 'gmail_for_instructors',
        test: (ctx) => ctx.instructorId && process.env.USE_OAUTH_EMAIL === 'true',
        provider: gmailProvider
    },
    {
        name: 'nodemailer_default',
        test: () => true, // Always matches as fallback
        provider: nodemailerProvider
    }
]
```

**Current Behavior:**
- **Instructor emails** (with `instructorId`) → Gmail OAuth (if configured)
- **System emails** (no `instructorId`) → Nodemailer (always)

**Problems:**
1. System emails fail if Nodemailer not configured
2. No unified email sending account for brand consistency
3. Cannot use Gmail OAuth for system emails

### Email Types

**Instructor Emails** (currently support Gmail OAuth):
- Booking confirmations
- Rescheduling notifications (student + instructor variants)

**System Emails** (currently hardcoded to Nodemailer):
- Purchase confirmations
- Low balance warnings
- Credits exhausted notifications
- Absence notifications

## Proposed Solution

### High-Level Design

**Default Behavior:**
- All emails (system + instructor) sent from a **system-level Gmail OAuth account**
- Configured once by admin
- Provides brand consistency and reliability

**Optional Per-Instructor Override:**
- Admin can enable `allow_email_override` flag on specific instructor accounts
- When enabled, instructor can connect their personal Gmail account
- Their emails (bookings, rescheduling) sent from their account instead of system account
- System emails always use system account

**Provider Selection Priority:**
1. **Per-instructor Gmail OAuth** (if instructor has override enabled + connected account)
2. **System-level Gmail OAuth** (if configured)
3. **Nodemailer** (fallback)

## Implementation Plan

### Phase 1: Database Schema Changes

#### 1.1 Update Instructors Table

Add field to control per-instructor email override:

```javascript
// Migration: add-instructor-email-override.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('instructors', 'allow_email_override', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Allow instructor to connect personal Gmail for sending emails'
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('instructors', 'allow_email_override');
  }
};
```

#### 1.2 Create System OAuth Tokens Table

Store system-level Gmail OAuth tokens (separate from instructor tokens):

```javascript
// Migration: create-system-oauth-tokens.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('system_oauth_tokens', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      provider: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'OAuth provider (e.g., "gmail")'
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Email address of the connected account'
      },
      access_token: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      refresh_token: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      token_expiry: {
        type: Sequelize.DATE,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('system_oauth_tokens', ['provider'], {
      unique: true
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('system_oauth_tokens');
  }
};
```

### Phase 2: Backend Models & Services

#### 2.1 SystemOAuthToken Model

Create new model to manage system-level OAuth tokens:

```javascript
// models/SystemOAuthToken.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/index');

const SystemOAuthToken = sequelize.define('SystemOAuthToken', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    provider: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    access_token: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    refresh_token: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    token_expiry: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: 'system_oauth_tokens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Static methods
SystemOAuthToken.getSystemToken = async function(provider = 'gmail') {
    return await this.findOne({
        where: { provider }
    });
};

SystemOAuthToken.isSystemTokenValid = async function(provider = 'gmail') {
    const token = await this.getSystemToken(provider);
    if (!token) return false;
    
    return new Date(token.token_expiry) > new Date();
};

SystemOAuthToken.updateSystemToken = async function(provider, tokenData) {
    const [record, created] = await this.upsert({
        provider,
        email: tokenData.email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expiry: tokenData.token_expiry
    });
    
    return record;
};

module.exports = { SystemOAuthToken };
```

#### 2.2 Update Instructor Model

Add method to check if instructor can use personal email:

```javascript
// Add to models/Instructor.js

Instructor.canUsePersonalEmail = async function(instructorId) {
    const instructor = await this.findByPk(instructorId, {
        attributes: ['allow_email_override']
    });
    
    return instructor?.allow_email_override || false;
};

Instructor.hasPersonalEmailConnected = async function(instructorId) {
    const token = await InstructorGoogleToken.findOne({
        where: { instructor_id: instructorId }
    });
    
    if (!token) return false;
    
    // Check if token is still valid
    return new Date(token.token_expiry) > new Date();
};
```

#### 2.3 Create SystemGmailProvider

New provider for system-level Gmail OAuth (similar to existing gmailProvider but uses system tokens):

```javascript
// services/email/systemGmailProvider.js
const { google } = require('googleapis');
const { SystemOAuthToken } = require('../../models/SystemOAuthToken');
const logger = require('../../utils/logger');

class SystemGmailProvider {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        this.configured = false;
        this.initializeAsync();
    }

    async initializeAsync() {
        try {
            const tokenRecord = await SystemOAuthToken.getSystemToken('gmail');
            
            if (tokenRecord) {
                this.oauth2Client.setCredentials({
                    access_token: tokenRecord.access_token,
                    refresh_token: tokenRecord.refresh_token,
                    expiry_date: new Date(tokenRecord.token_expiry).getTime()
                });
                this.configured = true;
                this.systemEmail = tokenRecord.email;
            }
        } catch (error) {
            logger.email('Failed to initialize system Gmail provider:', error);
        }
    }

    async send(to, subject, htmlContent, options = {}) {
        if (!this.configured) {
            return {
                success: false,
                provider: 'System Gmail',
                error: 'System Gmail OAuth not configured'
            };
        }

        try {
            const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
            
            const message = this.createMessage(to, subject, htmlContent);
            
            const result = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: message
                }
            });

            return {
                success: true,
                provider: 'System Gmail',
                messageId: result.data.id,
                email: this.systemEmail
            };
        } catch (error) {
            logger.email('System Gmail send failed:', error);
            return {
                success: false,
                provider: 'System Gmail',
                error: error.message
            };
        }
    }

    async sendWithAttachment(to, subject, htmlContent, attachment, options = {}) {
        // Similar implementation to send() but with attachment support
        // (Implementation details similar to existing gmailProvider)
    }

    createMessage(to, subject, htmlContent) {
        // Same implementation as existing gmailProvider
    }

    isAvailable() {
        return this.configured;
    }

    getConfigurationStatus() {
        if (this.configured) {
            return {
                configured: true,
                message: `System Gmail configured (${this.systemEmail})`
            };
        }
        return {
            configured: false,
            message: 'System Gmail OAuth not configured'
        };
    }
}

const systemGmailProvider = new SystemGmailProvider();
module.exports = systemGmailProvider;
```

#### 2.4 Update Email Provider Selection

Rewrite `services/email/emailConfig.js` with new priority logic:

```javascript
// services/email/emailConfig.js
const nodemailerProvider = require('./nodemailerProvider');
const gmailProvider = require('./gmailProvider'); // Per-instructor Gmail
const systemGmailProvider = require('./systemGmailProvider'); // NEW: System Gmail
const { Instructor } = require('../../models/Instructor');

const PROVIDER_RULES = [
    {
        name: 'instructor_gmail_override',
        test: async (ctx) => {
            // Use instructor's personal Gmail if:
            // 1. There's an instructorId
            // 2. Instructor has override enabled
            // 3. Instructor has connected their Gmail
            if (!ctx.instructorId) return false;
            
            const canOverride = await Instructor.canUsePersonalEmail(ctx.instructorId);
            if (!canOverride) return false;
            
            const hasConnected = await Instructor.hasPersonalEmailConnected(ctx.instructorId);
            return hasConnected;
        },
        provider: gmailProvider
    },
    {
        name: 'system_gmail',
        test: () => {
            // Use system Gmail if configured
            return systemGmailProvider.isAvailable();
        },
        provider: systemGmailProvider
    },
    {
        name: 'nodemailer_fallback',
        test: () => true, // Always matches as fallback
        provider: nodemailerProvider
    }
];

const selectProvider = async (context) => {
    for (const rule of PROVIDER_RULES) {
        const matches = typeof rule.test === 'function' 
            ? await rule.test(context) 
            : rule.test;
        
        if (matches) {
            return rule.provider;
        }
    }
    
    // Shouldn't reach here but fallback to nodemailer
    return nodemailerProvider;
};

module.exports = {
    selectProvider,
    PROVIDER_RULES // Export for testing
};
```

**IMPORTANT:** This makes `selectProvider` async, which requires updates to all callers in `EmailService.js`:

```javascript
// In EmailService.js - update all provider selection calls
async sendEmail(to, subject, htmlContent, options = {}) {
    const provider = await selectProvider(options); // Add await
    const result = await provider.send(to, subject, htmlContent, options);
    // ... rest of method
}
```

### Phase 3: Backend Routes

#### 3.1 System OAuth Routes

New admin routes for system-level Gmail OAuth connection:

```javascript
// routes/admin.js - Add new endpoints

/**
 * GET /api/admin/system-oauth/status
 * Check if system Gmail OAuth is configured
 */
router.get('/system-oauth/status', adminMiddleware, async (req, res) => {
    try {
        const { SystemOAuthToken } = require('../models/SystemOAuthToken');
        const isConfigured = await SystemOAuthToken.isSystemTokenValid('gmail');
        
        if (isConfigured) {
            const token = await SystemOAuthToken.getSystemToken('gmail');
            res.json({
                configured: true,
                email: token.email,
                provider: 'gmail'
            });
        } else {
            res.json({
                configured: false,
                message: 'System Gmail OAuth not configured'
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/admin/system-oauth/auth-url
 * Get OAuth authorization URL for admin to connect system Gmail
 */
router.get('/system-oauth/auth-url', adminMiddleware, async (req, res) => {
    try {
        const { google } = require('googleapis');
        
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.BASE_URL}/api/admin/system-oauth/callback`
        );

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/userinfo.email'
            ],
            prompt: 'consent' // Force consent to get refresh token
        });

        res.json({ authUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/admin/system-oauth/callback
 * OAuth callback - exchanges code for tokens and stores them
 */
router.get('/system-oauth/callback', adminMiddleware, async (req, res) => {
    try {
        const { code } = req.query;
        
        const { google } = require('googleapis');
        const { SystemOAuthToken } = require('../models/SystemOAuthToken');
        
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.BASE_URL}/api/admin/system-oauth/callback`
        );

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        
        // Get user email
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        // Store tokens in database
        await SystemOAuthToken.updateSystemToken('gmail', {
            email: userInfo.data.email,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expiry: new Date(tokens.expiry_date)
        });

        // Redirect to admin settings page
        res.redirect('/admin/settings?tab=email&success=system-oauth-connected');
    } catch (error) {
        res.redirect('/admin/settings?tab=email&error=oauth-failed');
    }
});

/**
 * DELETE /api/admin/system-oauth/disconnect
 * Disconnect system Gmail OAuth
 */
router.delete('/system-oauth/disconnect', adminMiddleware, async (req, res) => {
    try {
        const { SystemOAuthToken } = require('../models/SystemOAuthToken');
        await SystemOAuthToken.destroy({
            where: { provider: 'gmail' }
        });
        
        res.json({
            success: true,
            message: 'System Gmail disconnected'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/admin/instructors/:id/email-override
 * Toggle instructor email override permission
 */
router.patch('/instructors/:id/email-override', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { allowOverride } = req.body;
        
        const instructor = await Instructor.findByPk(id);
        if (!instructor) {
            return res.status(404).json({ error: 'Instructor not found' });
        }
        
        await instructor.update({
            allow_email_override: allowOverride
        });
        
        res.json({
            success: true,
            instructor: {
                id: instructor.id,
                allow_email_override: instructor.allow_email_override
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### Phase 4: Frontend Implementation

#### 4.1 Admin Settings UI - System OAuth Section

Add new section to admin settings page for system Gmail configuration:

```vue
<!-- frontend/src/components/admin/SystemEmailSettings.vue -->
<template>
  <div class="system-email-settings">
    <h3>System Email Account</h3>
    <p class="description">
      Configure a Gmail account for sending all system emails (purchase confirmations, 
      credit notifications, etc.) and instructor emails by default.
    </p>

    <!-- Connected State -->
    <div v-if="systemOAuthStatus.configured" class="connected-state">
      <div class="status-badge success">
        <span class="icon">✓</span>
        Connected
      </div>
      <div class="account-info">
        <strong>{{ systemOAuthStatus.email }}</strong>
        <p class="hint">All emails will be sent from this account by default</p>
      </div>
      <button @click="disconnectSystemOAuth" class="btn btn-danger">
        Disconnect
      </button>
    </div>

    <!-- Not Connected State -->
    <div v-else class="not-connected-state">
      <div class="status-badge warning">
        <span class="icon">⚠</span>
        Not Connected
      </div>
      <p class="warning-message">
        System emails will fall back to SMTP (if configured). 
        Connect a Gmail account for reliable email delivery.
      </p>
      <button @click="connectSystemOAuth" class="btn btn-primary">
        Connect Gmail Account
      </button>
    </div>

    <!-- Instructor Override Info -->
    <div class="instructor-override-info">
      <h4>Instructor Email Override</h4>
      <p>
        By default, all emails are sent from the system account. You can optionally 
        allow specific instructors to connect their personal Gmail accounts. 
        When enabled, emails related to their lessons will be sent from their account.
      </p>
      <router-link to="/admin/instructors" class="link">
        Manage instructor email permissions →
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAdminStore } from '@/stores/adminStore';

const adminStore = useAdminStore();
const systemOAuthStatus = ref({
  configured: false,
  email: null
});

onMounted(async () => {
  await fetchSystemOAuthStatus();
});

const fetchSystemOAuthStatus = async () => {
  try {
    const response = await fetch('/api/admin/system-oauth/status', {
      headers: {
        'Authorization': `Bearer ${adminStore.token}`
      }
    });
    systemOAuthStatus.value = await response.json();
  } catch (error) {
    console.error('Failed to fetch system OAuth status:', error);
  }
};

const connectSystemOAuth = async () => {
  try {
    const response = await fetch('/api/admin/system-oauth/auth-url', {
      headers: {
        'Authorization': `Bearer ${adminStore.token}`
      }
    });
    const { authUrl } = await response.json();
    
    // Redirect to Google OAuth
    window.location.href = authUrl;
  } catch (error) {
    console.error('Failed to get OAuth URL:', error);
  }
};

const disconnectSystemOAuth = async () => {
  if (!confirm('Are you sure you want to disconnect the system Gmail account? Emails will fall back to SMTP.')) {
    return;
  }
  
  try {
    await fetch('/api/admin/system-oauth/disconnect', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminStore.token}`
      }
    });
    
    await fetchSystemOAuthStatus();
  } catch (error) {
    console.error('Failed to disconnect:', error);
  }
};
</script>
```

#### 4.2 Admin Instructor Management - Email Override Toggle

Add toggle to instructor management page:

```vue
<!-- Add to frontend/src/components/admin/InstructorManager.vue -->
<template>
  <div class="instructor-row">
    <!-- ... existing instructor fields ... -->
    
    <!-- NEW: Email Override Toggle -->
    <div class="email-override-control">
      <label>
        <input 
          type="checkbox" 
          :checked="instructor.allow_email_override"
          @change="toggleEmailOverride(instructor)"
        />
        Allow personal email override
      </label>
      <span class="hint">
        {{ instructor.allow_email_override 
          ? 'Can use personal Gmail for emails' 
          : 'Uses system email account' }}
      </span>
    </div>
  </div>
</template>

<script setup>
const toggleEmailOverride = async (instructor) => {
  try {
    const response = await fetch(`/api/admin/instructors/${instructor.id}/email-override`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminStore.token}`
      },
      body: JSON.stringify({
        allowOverride: !instructor.allow_email_override
      })
    });
    
    const result = await response.json();
    
    // Update local state
    instructor.allow_email_override = result.instructor.allow_email_override;
  } catch (error) {
    console.error('Failed to toggle email override:', error);
  }
};
</script>
```

#### 4.3 Instructor Settings - Conditional OAuth

Update instructor Gmail connection page to only show if override is enabled:

```vue
<!-- Update frontend/src/components/GoogleCalendarSettings.vue -->
<template>
  <div class="google-settings">
    <!-- Email Override Check -->
    <div v-if="!instructor.allow_email_override" class="email-override-disabled">
      <div class="info-box">
        <p>
          Personal email override is not enabled for your account. 
          All emails will be sent from the system email address.
        </p>
        <p class="hint">
          Contact your administrator if you need to send emails from your personal Gmail account.
        </p>
      </div>
    </div>

    <!-- Only show OAuth connection if override is enabled -->
    <div v-else>
      <!-- ... existing Gmail OAuth connection UI ... -->
    </div>

    <!-- Calendar sync (always available) -->
    <div class="calendar-sync">
      <!-- ... existing calendar sync UI ... -->
    </div>
  </div>
</template>
```

### Phase 5: Testing Strategy

#### 5.1 Unit Tests

Test new models and provider selection:

```javascript
// tests/system-oauth.test.js
const { SystemOAuthToken } = require('../models/SystemOAuthToken');
const { selectProvider } = require('../services/email/emailConfig');

describe('SystemOAuthToken Model', () => {
    test('should store and retrieve system OAuth token', async () => {
        // Test implementation
    });
    
    test('should validate token expiry correctly', async () => {
        // Test implementation
    });
});

describe('Email Provider Selection', () => {
    test('should use instructor Gmail when override enabled and connected', async () => {
        // Test implementation
    });
    
    test('should use system Gmail for emails without instructorId', async () => {
        // Test implementation
    });
    
    test('should fall back to Nodemailer if no OAuth configured', async () => {
        // Test implementation
    });
});
```

#### 5.2 Integration Tests

Test full email sending flow:

```javascript
// tests/integration/email-provider-integration.test.js
describe('Email Provider Integration', () => {
    test('system emails should use system OAuth when configured', async () => {
        // Setup system OAuth
        // Send credits-exhausted email
        // Verify sent via system Gmail
    });
    
    test('instructor with override should use personal Gmail', async () => {
        // Enable instructor override
        // Connect instructor Gmail
        // Send booking confirmation
        // Verify sent via instructor Gmail
    });
    
    test('instructor without override should use system Gmail', async () => {
        // Disable instructor override
        // Send booking confirmation
        // Verify sent via system Gmail
    });
});
```

### Phase 6: Migration Path

#### 6.1 Database Migration

Run new migrations:
```bash
npx sequelize-cli db:migrate
```

#### 6.2 Deployment Steps

1. **Deploy Backend Updates**
   - Deploy new models, routes, providers
   - Run database migrations
   - Update environment variables if needed

2. **Configure System Gmail**
   - Admin logs in
   - Goes to Settings → Email
   - Clicks "Connect Gmail Account"
   - Authorizes system Gmail account
   - System now uses this for all emails

3. **Optional: Enable Instructor Overrides**
   - Admin goes to Instructors page
   - Checks "Allow personal email override" for specific instructors
   - Those instructors can now connect their personal Gmail

4. **Deploy Frontend Updates**
   - Deploy new Vue components
   - Update instructor settings page

#### 6.3 Backward Compatibility

- Existing instructor Gmail OAuth connections remain functional
- If system OAuth not configured, falls back to Nodemailer (current behavior)
- No breaking changes to existing functionality

### Phase 7: Documentation Updates

Update these files:

1. **README.md** - Add system OAuth setup instructions
2. **docs/EMAIL_SYSTEM.md** - New doc explaining email provider architecture
3. **CLAUDE.md** - Update email service description
4. **.env.example** - Add any new environment variables

## Security Considerations

1. **Token Storage**
   - System OAuth tokens stored encrypted in database
   - Never expose refresh tokens in API responses
   - Regular token rotation via refresh mechanism

2. **Admin-Only Access**
   - Only admins can configure system OAuth
   - Only admins can toggle instructor override permission
   - Instructors can only connect their own Gmail (not system)

3. **OAuth Scopes**
   - Request minimal scopes needed (`gmail.send` only)
   - No access to user's inbox or other Google services

## Performance Considerations

1. **Provider Selection**
   - `selectProvider()` now async (database query for instructor override check)
   - Consider caching instructor override status in memory/Redis
   - Minimal performance impact (< 10ms per email)

2. **Token Refresh**
   - Implement automatic token refresh when expired
   - Graceful degradation to Nodemailer if refresh fails

## Future Enhancements

**v2.0 Potential Features:**
- Support for multiple system OAuth accounts (round-robin load balancing)
- Per-instructor email templates
- Email sending analytics dashboard
- Scheduled email sending
- Email A/B testing

## Acceptance Criteria

**System OAuth:**
- [ ] Admin can connect system Gmail account
- [ ] Admin can disconnect system Gmail account
- [ ] System emails sent from system Gmail when configured
- [ ] Fallback to Nodemailer when system OAuth not configured

**Instructor Override:**
- [ ] Admin can enable/disable override per instructor
- [ ] Instructors with override can connect personal Gmail
- [ ] Instructors without override cannot connect Gmail
- [ ] Instructor emails use personal Gmail when override enabled + connected
- [ ] Instructor emails use system Gmail when override disabled

**Testing:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual testing of all email types
- [ ] OAuth flow tested end-to-end

**Documentation:**
- [ ] Admin setup guide created
- [ ] Developer documentation updated
- [ ] CHANGELOG.md updated

## Estimated Effort

- **Database & Models**: 3-4 hours
- **Backend Services & Routes**: 6-8 hours
- **Provider Selection Logic**: 3-4 hours
- **Frontend UI Components**: 6-8 hours
- **Testing**: 4-6 hours
- **Documentation**: 2-3 hours
- **Testing & Bug Fixes**: 4-6 hours

**Total Estimated Time**: 28-39 hours (~4-5 days)

## Questions & Decisions Needed

1. Should we support OAuth providers other than Gmail (e.g., Outlook, SendGrid)?
2. Should instructors be able to see which email account their emails are sent from?
3. Should we log all email sends with the provider used for auditing?
4. Do we need email sending quotas per instructor?
5. Should system OAuth tokens have an expiry/rotation policy?
