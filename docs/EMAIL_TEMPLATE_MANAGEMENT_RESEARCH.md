# Email Template Management System - Research & Architecture Report

## Executive Summary

This document provides a comprehensive analysis of options for implementing an editable email template system for the Lesson Booking application. The goal is to move from file-based Handlebars templates to database-stored templates that administrators can edit through a UI.

**Key Requirements:**
- Subject line and email body content editable (header/footer/container remain fixed)
- Database storage instead of file-based templates
- Handlebars variable support ({{userName}}, {{lessonDate}}, etc.)
- Test email sending capability
- Reset to default functionality
- Keep it simple for v1 (future WYSIWYG consideration)

---

## Current System Analysis

### Existing Architecture

**Template Structure:**
```
email-templates/
├── base/
│   └── email-layout.html       # Fixed wrapper (header, footer, styles)
├── contents/                   # Email-specific content
│   ├── booking-confirmation.html
│   ├── purchase-confirmation.html
│   ├── low-balance-warning.html
│   ├── credits-exhausted.html
│   ├── absence-notification.html
│   ├── rescheduling-student.html
│   └── rescheduling-instructor.html
└── partials/                   # Reusable components
    ├── cta-section.html
    ├── footer.html
    ├── lesson-details.html
    └── next-steps.html
```

**Email Service Flow:**
1. [`EmailService.js`](services/EmailService.js:114) loads and compiles Handlebars templates
2. Templates are cached in memory (`Map` object)
3. Partials and helpers registered at initialization
4. Content templates rendered with data, then wrapped in base layout
5. Final HTML sent via Nodemailer with Gmail SMTP

**Current Templates:**
- 7 content templates total
- Heavy use of partials for consistency
- Complex data structures with nested objects
- Calendar attachment generation for bookings

---

## Research Findings

### 1. NPM Package Solutions

#### A. **Handlebars (Current) + Database Storage** ⭐ RECOMMENDED
**Package:** `handlebars` (already installed)
**Approach:** Store Handlebars template strings in database, compile at runtime

**Pros:**
- Zero additional dependencies
- Maintains compatibility with existing templates
- Proven, battle-tested library
- Simple migration path
- No learning curve for existing codebase

**Cons:**
- No built-in UI for editing
- Requires custom variable insertion interface
- Admin can break templates with invalid syntax

**Use Case:** Perfect for v1 text-based editing with future WYSIWYG migration

---

#### B. **MJML** - Responsive Email Framework
**Package:** `mjml` + `mjml-browser` 
**Website:** https://mjml.io/
**License:** MIT (Free)

**Pros:**
- Industry standard for responsive emails
- Compiles to bulletproof HTML
- Better mobile compatibility than raw HTML
- React component available (`mjml-react`)
- Great documentation

**Cons:**
- Requires rewriting all existing templates
- Different syntax than Handlebars (learning curve)
- Larger build size
- More complex integration
- Overkill for simple text changes

**Verdict:** Too heavy for v1, but worth considering for v2 complete redesign

---

#### C. **Email Builder Libraries**

**1. `react-email-editor`** (Unlayer)
- Visual drag-and-drop builder
- Free tier available
- Proprietary format, exports HTML
- ❌ Too complex for v1 requirements

**2. `grapesjs-preset-newsletter`** (GrapeJS)
- Open-source visual editor
- Block-based editing
- Template storage as JSON
- ❌ Requires complete template restructure

**3. `bee-plugin`** (BEE Free)
- Professional email builder
- Freemium model (limits on free tier)
- Great UI but vendor lock-in
- ❌ Not suitable for open-source project

---

#### D. **Template Engines Comparison**

| Engine | Syntax | DB Compatible | Learning Curve | Status |
|--------|--------|---------------|----------------|--------|
| **Handlebars** | `{{var}}` | ✅ | Low (current) | ✅ Use this |
| Mustache | `{{var}}` | ✅ | Low | Similar to HB |
| EJS | `<%= var %>` | ✅ | Low | Migration needed |
| Pug | `p= var` | ✅ | High | Migration needed |
| Nunjucks | `{{ var }}` | ✅ | Medium | Migration needed |

**Recommendation:** Stick with Handlebars for v1

---

### 2. WYSIWYG Editor Options (Future Consideration)

#### A. **Tiptap** ⭐ BEST FOR FUTURE WYSIWYG
**Package:** `@tiptap/vue-3` + `@tiptap/starter-kit`
**License:** MIT (Free for core, pro extensions paid)
**Website:** https://tiptap.dev/

**Why Tiptap:**
- Built specifically for Vue 3 (perfect fit)
- Headless editor (full UI control)
- Extensible with custom nodes
- Can integrate variable insertion as custom extensions
- Active development, great docs
- Used by GitLab, Substack, Axios

**Integration Path:**
1. Store Handlebars templates in DB (v1)
2. Parse Handlebars syntax in Tiptap editor (v2)
3. Render variables as special nodes/marks
4. Export back to Handlebars syntax

**Estimated Effort:** 3-5 days for basic integration

---

#### B. **Alternatives**

**1. TinyMCE**
- Industry standard
- Feature-rich
- ❌ Cloud-hosted version has usage limits
- ❌ Self-hosted requires license for full features

**2. CKEditor**
- Powerful commercial editor
- ❌ Pricing model not ideal for open-source
- ❌ Heavier than Tiptap

**3. Quill**
- Lightweight and simple
- ❌ Less extensible than Tiptap
- ❌ Limited Vue 3 support

**Verdict:** Tiptap is the clear winner for future Vue 3 integration

---

### 3. Database Design Best Practices

#### Schema Design (Recommended)

```sql
CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    template_key VARCHAR(100) NOT NULL UNIQUE,     -- e.g., 'booking-confirmation'
    category VARCHAR(50) NOT NULL,                 -- e.g., 'booking', 'payment', 'credit'
    name VARCHAR(255) NOT NULL,                    -- Display name: "Booking Confirmation"
    description TEXT,                              -- Admin-facing description
    subject_template TEXT NOT NULL,                -- Handlebars subject: "Lesson Confirmed - {{lessonDate}}"
    body_template TEXT NOT NULL,                   -- Handlebars body HTML
    default_subject_template TEXT NOT NULL,        -- Original subject (for reset)
    default_body_template TEXT NOT NULL,           -- Original body (for reset)
    available_variables JSONB NOT NULL,            -- Variable metadata (see below)
    is_active BOOLEAN DEFAULT true,
    last_edited_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_templates_key ON email_templates(template_key);
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_active ON email_templates(is_active);
```

**available_variables JSONB Structure:**
```json
{
  "user": {
    "userName": { "type": "string", "description": "Student's full name", "example": "John Smith" },
    "userEmail": { "type": "string", "description": "Student's email address", "example": "john@example.com" }
  },
  "lesson": {
    "lessonDate": { "type": "date", "description": "Formatted lesson date", "example": "Monday, January 15, 2024" },
    "startTime": { "type": "time", "description": "Lesson start time", "example": "2:00 PM" },
    "endTime": { "type": "time", "description": "Lesson end time", "example": "3:00 PM" },
    "instructorName": { "type": "string", "description": "Instructor's name", "example": "Sarah Johnson" },
    "duration": { "type": "number", "description": "Lesson duration in minutes", "example": "60" }
  },
  "booking": {
    "bookingId": { "type": "string", "description": "Unique booking identifier", "example": "12345" }
  },
  "payment": {
    "paymentDisplay": { "type": "string", "description": "Payment method", "example": "Lesson Credits" }
  }
}
```

#### Version History Table (Optional for v1, Recommended for v2)

```sql
CREATE TABLE email_template_versions (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES email_templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    edited_by INTEGER REFERENCES users(id),
    change_description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(template_id, version_number)
);
```

---

### 4. Variable/Placeholder Management Strategy

#### Option A: Grouped Dropdown Menus ⭐ RECOMMENDED

**Implementation:**
```vue
<div class="variable-inserter">
  <select v-model="selectedGroup" class="variable-group-select">
    <option value="">Insert Variable...</option>
    <optgroup label="User Information">
      <option value="{{userName}}">Student Name</option>
      <option value="{{userEmail}}">Student Email</option>
    </optgroup>
    <optgroup label="Lesson Details">
      <option value="{{lessonDate}}">Lesson Date</option>
      <option value="{{startTime}}">Start Time</option>
      <option value="{{endTime}}">End Time</option>
      <option value="{{instructorName}}">Instructor Name</option>
      <option value="{{duration}}">Duration (minutes)</option>
    </optgroup>
    <optgroup label="Booking Information">
      <option value="{{bookingId}}">Booking ID</option>
      <option value="{{paymentDisplay}}">Payment Method</option>
    </optgroup>
  </select>
</div>
```

**Pros:**
- Clear categorization
- Prevents typing errors
- Self-documenting
- Easy to implement

**Cons:**
- Clicking required (not keyboard-first)
- Less flexible than direct typing

---

#### Option B: Autocomplete/Tag Input

**Example:** `@mentions`-style variable insertion
- Type `{{` to trigger autocomplete
- Filter as you type
- Insert on selection

**Pros:**
- Keyboard-friendly
- Fast for power users
- Feels modern

**Cons:**
- More complex implementation
- Requires autocomplete library
- Learning curve

---

#### Option C: Hybrid Approach ⭐ BEST FOR v2

**Combine both:**
- Dropdown for discovery
- Manual typing for speed
- Syntax highlighting for validation

**Libraries:**
- `codemirror` or `monaco-editor` for syntax highlighting
- Custom Handlebars mode

---

### 5. Implementation Approaches

#### Approach 1: Simple Text Editor (v1 Recommended) ⭐

**Stack:**
- Plain `<input>` for subject line
- Large `<textarea>` for body (auto-resizing, ~25 rows)
- Grouped `<select>` dropdown for variable insertion
- Basic validation (check for unclosed `{{}}`)
- Preview with sample data
- Test email sending

**Effort:** 2-3 days
**Complexity:** Low
**Future-proof:** Easy migration to WYSIWYG
**Note:** No syntax highlighting needed - variables inserted via dropdown prevents syntax errors

**UI Mockup:**
```
┌─────────────────────────────────────────┐
│ Email Template: Booking Confirmation    │
├─────────────────────────────────────────┤
│ Subject Line:                           │
│ ┌─────────────────────────────────────┐ │
│ │ Lesson Confirmed - {{lessonDate}}   │ │
│ └─────────────────────────────────────┘ │
│ [Insert Variable ▼]                     │
├─────────────────────────────────────────┤
│ Email Body:                             │
│ ┌─────────────────────────────────────┐ │
│ │ <p>Hello {{userName}},</p>          │ │
│ │                                     │ │
│ │ <p>Your lesson has been...         │ │
│ │                                     │ │
│ │ (25 lines tall)                    │ │
│ └─────────────────────────────────────┘ │
│ [Insert Variable ▼]                     │
├─────────────────────────────────────────┤
│ [Preview with Sample Data]              │
│ [Send Test Email] [Reset to Default]   │
│ [Save Changes]                          │
└─────────────────────────────────────────┘
```

---

#### Approach 2: Monaco Editor (v1.5 Enhanced) - NOT RECOMMENDED

**Why skip this:**
- Syntax highlighting provides minimal value when variables are inserted via dropdown
- Admins won't be typing `{{variable}}` syntax manually (dropdown prevents errors)
- HTML syntax highlighting is overkill for simple paragraph/text editing
- Adds significant complexity for negligible UX benefit
- Plain textarea is sufficient and keeps implementation simple

**If you really want better editing UX:**
- Consider simple auto-resizing textarea
- Add line numbers if needed
- Basic HTML entity helpers (bold, italic buttons)

**Verdict:** Skip Monaco Editor for v1, stick with plain textarea

---

#### Approach 3: Full WYSIWYG (v2 Future)

**Stack:**
- Tiptap editor
- Custom variable nodes
- Visual editing
- HTML output to Handlebars

**Effort:** 5-7 days
**Complexity:** High
**Timeline:** v2.0

---

## Recommended Solution

### Phase 1 (v1): Database + Simple Text Editor

**Architecture:**

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Vue 3)                 │
├─────────────────────────────────────────────────────┤
│  EmailTemplatesSection.vue                          │
│  ├─ Template List (7 templates)                     │
│  ├─ Template Editor                                 │
│  │  ├─ Subject Input                                │
│  │  ├─ Body Textarea (or Monaco Editor)             │
│  │  ├─ Variable Dropdown (grouped)                  │
│  │  └─ Actions (Preview, Test, Reset, Save)        │
│  └─ Preview Modal                                   │
└─────────────────────────────────────────────────────┘
                         ▼ HTTP API
┌─────────────────────────────────────────────────────┐
│                Backend (Express + Sequelize)        │
├─────────────────────────────────────────────────────┤
│  routes/admin.js                                    │
│  ├─ GET  /api/admin/email-templates                 │
│  ├─ GET  /api/admin/email-templates/:key            │
│  ├─ PUT  /api/admin/email-templates/:key            │
│  ├─ POST /api/admin/email-templates/:key/reset      │
│  ├─ POST /api/admin/email-templates/:key/preview    │
│  └─ POST /api/admin/email-templates/:key/test       │
│                                                     │
│  models/EmailTemplate.js (Sequelize model)          │
│  ├─ findByKey()                                     │
│  ├─ updateTemplate()                                │
│  ├─ resetToDefault()                                │
│  └─ getAvailableVariables()                         │
│                                                     │
│  services/EmailService.js (UPDATED)                 │
│  ├─ loadTemplateFromDB() [NEW]                      │
│  ├─ renderTemplate() [UPDATED]                      │
│  ├─ sendTestEmail() [NEW]                           │
│  └─ validateTemplate() [NEW]                        │
└─────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│              Database (PostgreSQL/SQLite)           │
├─────────────────────────────────────────────────────┤
│  email_templates table                              │
│  ├─ template_key (unique)                           │
│  ├─ subject_template (Handlebars)                   │
│  ├─ body_template (Handlebars)                      │
│  ├─ default_subject_template                        │
│  ├─ default_body_template                           │
│  └─ available_variables (JSONB)                     │
└─────────────────────────────────────────────────────┘
```

---

### Migration Strategy

**Step 1: Create Database Schema**
- Migration file to create `email_templates` table
- Seed script to populate with existing templates

**Step 2: Update EmailService**
- Add `loadTemplateFromDB()` method
- Fallback to file-based templates if DB empty
- Cache compiled templates (same as current)

**Step 3: Build Admin UI**
- Template list view
- Simple text editor with variable dropdown
- Preview with sample data
- Test email functionality

**Step 4: Gradual Rollout**
- Keep file-based templates as fallback
- Admin can opt-in per template
- Monitor for issues

---

## API Design

### GET `/api/admin/email-templates`
**Purpose:** List all email templates
**Response:**
```json
{
  "templates": [
    {
      "id": 1,
      "key": "booking-confirmation",
      "name": "Booking Confirmation",
      "category": "booking",
      "isModified": false,
      "lastEditedBy": null,
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### GET `/api/admin/email-templates/:key`
**Purpose:** Get single template for editing
**Response:**
```json
{
  "template": {
    "id": 1,
    "key": "booking-confirmation",
    "name": "Booking Confirmation",
    "description": "Sent when a student books a lesson",
    "category": "booking",
    "subjectTemplate": "Lesson Confirmed - {{lessonDate}}",
    "bodyTemplate": "<p>Hello {{userName}},</p>\n<p>Your lesson has been confirmed...</p>",
    "availableVariables": {
      "user": { ... },
      "lesson": { ... },
      "booking": { ... }
    },
    "isModified": false,
    "lastEditedBy": null,
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### PUT `/api/admin/email-templates/:key`
**Purpose:** Update template
**Request:**
```json
{
  "subjectTemplate": "New subject - {{lessonDate}}",
  "bodyTemplate": "<p>New body with {{userName}}</p>"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Template updated successfully",
  "template": { ... }
}
```

**Validation:**
- Check for unclosed Handlebars tags
- Validate variable names against available_variables
- Ensure required variables are present

---

### POST `/api/admin/email-templates/:key/reset`
**Purpose:** Reset template to default
**Response:**
```json
{
  "success": true,
  "message": "Template reset to default",
  "template": { ... }
}
```

---

### POST `/api/admin/email-templates/:key/preview`
**Purpose:** Generate preview with sample data
**Request:**
```json
{
  "subjectTemplate": "Test - {{userName}}",
  "bodyTemplate": "<p>Hello {{userName}}</p>"
}
```
**Response:**
```json
{
  "preview": {
    "subject": "Test - John Smith",
    "body": "<html>...rendered email...</html>",
    "usedVariables": ["userName"],
    "missingVariables": []
  }
}
```

---

### POST `/api/admin/email-templates/:key/test`
**Purpose:** Send test email to specified address
**Request:**
```json
{
  "testEmail": "admin@example.com",
  "useCurrentTemplate": true
}
```
**Response:**
```json
{
  "success": true,
  "message": "Test email sent to admin@example.com",
  "messageId": "<...@gmail.com>"
}
```

**Note:** Only available if email service is configured

---

## Sample Data for Testing

```javascript
const SAMPLE_DATA = {
  'booking-confirmation': {
    userName: 'John Smith',
    userEmail: 'john.smith@example.com',
    studentName: 'John Smith',
    studentEmail: 'john.smith@example.com',
    lessonDate: 'Monday, January 15, 2024',
    startTime: '2:00 PM',
    endTime: '3:00 PM',
    duration: 60,
    instructorName: 'Sarah Johnson',
    paymentDisplay: 'Lesson Credits',
    bookingId: '12345'
  },
  'purchase-confirmation': {
    userName: 'Jane Doe',
    userEmail: 'jane.doe@example.com',
    planName: '10-Lesson Package',
    planCredits: 10,
    transactionAmount: '$150.00',
    paymentMethod: 'Credit Card',
    transactionDate: 'January 15, 2024',
    transactionId: 'pi_123456789'
  },
  // ... etc for all templates
};
```

---

## Cost & Effort Estimates

### v1 Implementation (Simple Text Editor)

| Task | Effort | Complexity |
|------|--------|------------|
| Database schema + migration | 2 hours | Low |
| Seed script for existing templates | 2 hours | Low |
| EmailTemplate Sequelize model | 3 hours | Low |
| Update EmailService to use DB | 4 hours | Medium |
| Admin API endpoints | 6 hours | Medium |
| Frontend template list UI | 4 hours | Low |
| Frontend editor UI (plain textarea) | 6 hours | Low |
| Variable dropdown component | 3 hours | Low |
| Preview functionality | 4 hours | Medium |
| Test email functionality | 3 hours | Low |
| Validation & error handling | 4 hours | Medium |
| Testing & debugging | 6 hours | Medium |
| **Total** | **~47 hours** | **~2 days** |

### v2 Implementation (Tiptap WYSIWYG)
**Estimated:** 40-60 hours (5-7 days) additional work

---

## Risks & Mitigation

### Risk 1: Admin Breaks Template with Invalid Syntax
**Impact:** High - Emails fail to send
**Mitigation:**
- Real-time syntax validation before save
- Preview with actual rendering
- Automatic backup of last working version
- "Revert to Default" button always available

### Risk 2: Variable Typos
**Impact:** Medium - Missing data in emails
**Mitigation:**
- Validate variable names against schema
- Dropdown insertion (no typing errors)
- Preview shows missing variables as warnings

### Risk 3: Database Migration Issues
**Impact:** Medium - Existing emails break during deployment
**Mitigation:**
- Seed script runs automatically
- File-based fallback if DB template missing
- Gradual rollout per template

### Risk 4: WYSIWYG Editor Complexity (Future)
**Impact:** Low - Takes longer than expected
**Mitigation:**
- Keep v1 simple text editor working
- Tiptap integration is optional enhancement
- Can defer to v2.0 or later

---

## Recommendations Summary

### ✅ For v1 (Immediate Implementation):

1. **Use Handlebars + Database Storage**
   - Minimal changes to existing system
   - No new dependencies
   - Simple migration path

2. **Simple Text Editor UI**
   - Basic `<input>` for subject line
   - Plain `<textarea>` for body (auto-resizing)
   - Grouped `<select>` dropdown for variables
   - No syntax highlighting needed (dropdown prevents errors)
   - No WYSIWYG (keep it simple)

3. **Database Schema as Designed Above**
   - Store defaults for reset functionality
   - JSONB for variable metadata
   - No version history in v1 (add in v2 if needed)

4. **Essential Features:**
   - Edit subject + body
   - Preview with sample data
   - Send test email
   - Reset to default
   - Syntax validation

### 🔮 For v2 (Future Enhancements):

1. **Tiptap WYSIWYG Editor**
   - Visual editing
   - Better UX for non-technical admins
   - Custom variable nodes

2. **Version History**
   - Track changes over time
   - Rollback capability

3. **Custom Templates**
   - User-defined triggers
   - Template builder interface

---

## Conclusion

The recommended approach for v1 is a **simple, pragmatic solution** that:
- ✅ Maintains compatibility with existing Handlebars templates
- ✅ Requires minimal new dependencies (zero additional packages)
- ✅ Can be implemented in ~2 days (~47 hours)
- ✅ Provides a clear path to WYSIWYG in v2
- ✅ Minimizes risk of breaking existing functionality
- ✅ Simple textarea interface (no complex editors needed)

**Next Steps:**
1. Review and approve this architecture
2. Create database migration
3. Implement backend API
4. Build frontend UI with plain textarea
5. Test with all 7 existing templates
6. Deploy with file-based fallback

**Future Roadmap:**
- v2.0: Tiptap WYSIWYG with visual editing
- v3.0: Custom user-defined templates with trigger system

**Note on Syntax Highlighting:**
Monaco Editor or syntax highlighting is **not recommended** for v1 because:
- Variables inserted via dropdown = no syntax errors
- Minimal HTML editing = no complex syntax to highlight
- Adds complexity without meaningful UX benefit
- Plain textarea is sufficient and keeps implementation simple
