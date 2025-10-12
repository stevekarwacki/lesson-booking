# Business Information Feature Documentation

## Overview

The Business Information feature allows administrators to configure and manage company details, contact information, and organizational settings that are used throughout the lesson booking application. This feature provides a centralized location for admins to maintain business data with proper validation, persistence, and an intuitive user interface.

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [Validation Rules](#validation-rules)
7. [Testing](#testing)
8. [Usage Guide](#usage-guide)
9. [Troubleshooting](#troubleshooting)

## Features

### Core Functionality
- **Company Information Management**: Store and edit company name, contact details, address
- **Input Validation**: Client-side and server-side validation with specific error messages
- **Data Persistence**: Reliable database storage with audit trails
- **Responsive UI**: Clean, accessible interface that works across devices
- **Real-time Feedback**: Immediate validation feedback and success/error messages
- **Permission Control**: Admin-only access with CASL permission system integration

### Current Fields
- **Company Name** (required) - Main business identifier
- **Contact Email** (required) - Primary business email address  
- **Phone Number** (optional) - Business phone contact
- **Base URL** (optional) - Company website URL
- **Business Address** (optional) - Physical business location
- **Social Media Links** (optional) - Facebook, Twitter, Instagram, LinkedIn, YouTube URLs

### Future Extensions
- **Business Hours** - Operating hours by day of the week
- **Logo Upload** - Company logo with validation and processing

## Architecture

### System Design
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Database      │
│                 │    │                  │    │                 │
│ AdminSettings   │◄──►│ /api/admin/      │◄──►│ app_settings    │
│ Page            │    │ settings         │    │ table           │
│                 │    │                  │    │                 │
│ BusinessInfo    │    │ - GET /settings  │    │ - Key/Value     │
│ Section         │    │ - PUT /business  │    │ - Categories    │
│                 │    │ - Validation     │    │ - Audit Trail   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Component Hierarchy
```
AdminSettingsPage
├── SettingsTabs (navigation)
├── BusinessInfoSection (current feature)
├── ThemeConfigSection (future)
└── EmailTemplatesSection (future)
```

## Database Schema

### AppSettings Table
```sql
CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category VARCHAR(50) NOT NULL,           -- 'business', 'theme', 'email'
  key VARCHAR(100) NOT NULL,               -- Setting identifier
  value TEXT,                              -- Setting value (JSON for complex data)
  updated_by INTEGER NOT NULL,             -- Foreign key to users.id
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),
  CONSTRAINT unique_category_key UNIQUE (category, key)
);

-- Indexes
CREATE UNIQUE INDEX unique_category_key ON app_settings (category, key);
CREATE INDEX idx_app_settings_category ON app_settings (category);
```

### Data Storage Format
Business information is stored with these keys:
- `business.company_name` - Company display name
- `business.contact_email` - Primary contact email
- `business.phone_number` - Business phone number
- `business.base_url` - Company website URL
- `business.address` - Business address
- `business.social_media_facebook` - Facebook profile URL
- `business.social_media_twitter` - Twitter profile URL
- `business.social_media_instagram` - Instagram profile URL
- `business.social_media_linkedin` - LinkedIn company page URL
- `business.social_media_youtube` - YouTube channel URL

## API Endpoints

### GET /api/admin/settings
Retrieves all application settings organized by category.

**Authentication**: Required (Admin role)
**Method**: GET
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "business": {
    "companyName": "My Company",
    "contactEmail": "contact@company.com",
    "phoneNumber": "555-0123",
    "website": "https://company.com",
    "address": "123 Business St",
    "socialMedia": { 
      "facebook": "https://facebook.com/mycompany",
      "twitter": "https://twitter.com/mycompany",
      "instagram": "https://instagram.com/mycompany",
      "linkedin": "https://linkedin.com/company/mycompany",
      "youtube": "https://youtube.com/mychannel"
    },
    "businessHours": { "monday": { "isOpen": true, "open": "09:00", "close": "17:00" } }
  },
  "theme": { },
  "email": { }
}
```

### PUT /api/admin/settings/business
Updates business information settings.

**Authentication**: Required (Admin role)
**Method**: PUT
**Headers**: 
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "companyName": "Updated Company Name",
  "contactEmail": "new@company.com",
  "phoneNumber": "555-0199",
  "website": "https://newcompany.com",
  "address": "456 New Street",
  "socialMedia": {
    "facebook": "https://facebook.com/newcompany",
    "twitter": "https://twitter.com/newcompany",
    "instagram": "https://instagram.com/newcompany",
    "linkedin": "https://linkedin.com/company/newcompany",
    "youtube": "https://youtube.com/newchannel"
  }
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Business settings updated successfully",
  "data": {
    "companyName": "Updated Company Name",
    "contactEmail": "new@company.com",
    "phoneNumber": "555-0199",
    "website": "https://newcompany.com",
    "address": "456 New Street"
  }
}
```

**Validation Error Response** (400):
```json
{
  "error": "Validation failed",
  "details": {
    "company_name": "Company name is required",
    "contact_email": "Please enter a valid email address"
  }
}
```

### GET /api/public/business-info
Retrieves public business information for display in footers and other public areas.

**Authentication**: None required (public endpoint)
**Method**: GET

**Response**:
```json
{
  "companyName": "My Company",
  "contactEmail": "contact@company.com",
  "phoneNumber": "555-0123",
  "website": "https://company.com",
  "address": "123 Business St",
  "socialMedia": {
    "facebook": "https://facebook.com/mycompany",
    "twitter": "https://twitter.com/mycompany",
    "instagram": "https://instagram.com/mycompany",
    "linkedin": "https://linkedin.com/company/mycompany",
    "youtube": "https://youtube.com/mychannel"
  }
}
```

**Error Handling**: Returns empty structure instead of error to prevent breaking public displays

## Frontend Components

### AdminSettingsPage.vue
Main container component that manages settings navigation and API communication.

**Key Features**:
- Tab-based navigation using `SettingsTabs` component
- Centralized error/success message handling
- API communication for loading and saving settings
- Reactive data flow to child components

**Props**: None (route-based component)
**Events**: None (handles child events internally)

### BusinessInfoSection.vue
Form component for business information management.

**Props**:
- `initialData` (Object) - Pre-populated form data
- `loading` (Boolean) - Loading state indicator
- `clearErrors` (Number|null) - Signal to clear validation errors

**Events**:
- `change` - Emitted when form is submitted with valid data

**Key Features**:
- Real-time form validation
- Accessible form design
- Change tracking to show unsaved modifications
- Integration with parent component's error clearing

### SettingsTabs.vue
Reusable tab navigation component.

**Props**:
- `tabs` (Array) - Tab configuration with components and props
- `initialTab` (String) - Initially active tab ID
- `defaultTabId` (String) - Default tab for mobile view

**Events**:
- `tab-change` - Tab selection changes
- `content-change` - Child component emits changes

## Validation Rules

### Company Name
- **Required**: Yes
- **Min Length**: 1 character
- **Max Length**: 100 characters
- **Error Messages**: 
  - "Company name is required" (empty)
  - "Company name must be 100 characters or less" (too long)

### Contact Email
- **Required**: Yes
- **Format**: Valid email address (RFC 5322 compliant)
- **Error Messages**:
  - "Contact email is required" (empty)
  - "Please enter a valid email address" (invalid format)

### Phone Number
- **Required**: No
- **Format**: Flexible phone number format (international supported)
- **Length**: 7-20 characters
- **Error Messages**:
  - "Please enter a valid phone number" (invalid format)

### Base URL
- **Required**: No
- **Format**: Valid URL with protocol (http/https)
- **Error Messages**:
  - "Please enter a valid URL (e.g., https://example.com)" (invalid format)

### Business Address
- **Required**: No
- **Max Length**: 500 characters
- **Error Messages**:
  - "Address must be 500 characters or less" (too long)

### Social Media URLs
- **Required**: No (all platforms optional)
- **Format**: Valid URL with http/https protocol
- **Supported Platforms**: Facebook, Twitter, Instagram, LinkedIn, YouTube
- **Error Messages**:
  - "Please enter a valid URL (e.g., https://facebook.com/yourcompany)" (invalid format)
  - "Social media URL must use http or https" (invalid protocol)

## Testing

### Backend Tests
Location: `/tests/app-settings-validation.test.js` and `/tests/public-api.test.js`

**Test Coverage**:
- AppSettings model CRUD operations
- Business setting validation functions (including social media URLs)
- Social media URL validation (valid/invalid formats, protocols)
- API endpoint responses (admin and public endpoints)
- Error handling scenarios
- Database constraints and indexes
- Public API graceful error handling

**Running Tests**:
```bash
# Run specific test file
node tests/app-settings.test.js

# Or include in full test suite
npm test
```

### Frontend Tests
Location: `/frontend/src/tests/business-info.test.js`

**Test Coverage**:
- Component rendering and form fields (including social media inputs)
- Form validation (client-side)
- Social media field population and submission
- Data binding and reactivity
- Event emission and handling
- Error state management
- Integration between AdminSettingsPage and BusinessInfoSection

**Running Tests**:
```bash
# From frontend directory
npm run test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

## Usage Guide

### For Administrators

#### Accessing Business Settings
1. Log in as an administrator
2. Navigate to Settings from the main navigation
3. Select "Business Information" tab (default)

#### Updating Company Information
1. Fill out the required fields (Company Name, Contact Email)
2. Optionally complete additional fields (Phone, Website, Address)
3. Click "Save Business Information"
4. Verify success message appears
5. Data is automatically saved and will persist across sessions

#### Form Validation
- **Real-time validation**: Error messages appear as you type
- **Required field indicators**: Asterisks (*) mark required fields
- **Submit validation**: Form prevents submission if validation fails
- **Error clearing**: Errors disappear automatically on successful save

### For Developers

#### Adding New Business Fields
1. **Update Database**: Add new key to business category
2. **Update Model**: Add validation in `AppSettings.validateBusinessSetting()`
3. **Update API**: Add field mapping in admin routes
4. **Update Frontend**: Add form field in `BusinessInfoSection.vue`
5. **Update Tests**: Add test cases for new field

#### Extending to Other Categories
1. Create new section component (e.g., `ThemeConfigSection.vue`)
2. Add category handling in `routes/admin.js`
3. Update `AdminSettingsPage.vue` tabs configuration
4. Add appropriate validation logic

## Troubleshooting

### Common Issues

#### "Validation failed" errors appearing after successful save
**Cause**: Frontend validation errors not being cleared
**Solution**: Ensure `clearErrors` prop is properly reactive
```javascript
// Check that success message triggers clearErrors update
clearErrors: success.value ? Date.now() : null
```

#### Form fields clearing after save
**Cause**: Data format mismatch between frontend and backend
**Solution**: Ensure backend returns data in frontend format
```javascript
// Backend should return:
{ companyName: "value" }
// Not:
{ company_name: "value" }
```

#### Database migration issues
**Cause**: Sequelize CLI configuration problems
**Solution**: Ensure `.sequelizerc` exists and `config/database.js` exports full config for CLI
```javascript
module.exports = process.env.SEQUELIZE_CLI ? config : config[process.env.NODE_ENV || 'development'];
```

### Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| "Cannot find config/config.json" | Sequelize CLI misconfiguration | Create `.sequelizerc` file |
| "SQLITE_ERROR: near '(': syntax error" | Invalid SQL syntax in migration | Use `CURRENT_TIMESTAMP` instead of `now()` |
| "Unexpected token '<'" | Frontend receiving HTML instead of JSON | Check API endpoint exists and returns JSON |
| "Form validation failed" | Client-side validation preventing submission | Check browser console for validation details |

### Performance Considerations

#### Database Queries
- Settings are cached by category for efficient retrieval
- Unique indexes prevent duplicate category/key combinations
- Foreign key constraints maintain data integrity

#### Frontend Optimization
- Form validation is debounced to prevent excessive API calls
- Component props are reactive for efficient re-rendering
- Tab switching clears previous state to prevent memory leaks

### Security Notes

#### Input Sanitization
- All string inputs are trimmed before storage
- HTML entities are not automatically escaped (consider adding if needed)
- URL validation prevents javascript: protocol injection

#### Access Control
- All endpoints require admin authentication
- CASL permissions system enforces access control
- Audit trail tracks who made changes and when

## Migration Guide

### From Static Configuration
If migrating from hardcoded business information:

1. **Identify Current Values**: Extract existing company info from code
2. **Create Migration**: Add initial data migration to populate settings
3. **Update References**: Replace hardcoded values with dynamic lookups
4. **Test Thoroughly**: Ensure all references work with new system

### Database Migrations
Always create proper migrations for schema changes:

```bash
# Generate migration
SEQUELIZE_CLI=true npx sequelize-cli migration:generate --name add-business-settings

# Run migration
SEQUELIZE_CLI=true npx sequelize-cli db:migrate

# Rollback if needed
SEQUELIZE_CLI=true npx sequelize-cli db:migrate:undo
```

---

**Last Updated**: September 2025
**Version**: 1.0.0
**Maintainer**: Development Team
