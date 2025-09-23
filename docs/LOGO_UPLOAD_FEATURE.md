# Logo Upload Feature

## Overview

The Logo Upload feature allows administrators to upload, manage, and configure company logos for the lesson booking application. This Node.js/Express backend with Vue 3 frontend includes logo positioning, automatic image processing, and secure file handling.

**Tech Stack**: Express.js, Sequelize ORM, Vue 3, Sharp (image processing), Multer (file uploads)

## Features

- **Logo Upload & Management**: Upload, preview, and remove company logos
- **Image Processing**: Automatic resizing, format conversion, and validation
- **Logo Positioning**: Configure logo placement (left or center) in the navigation header
- **Responsive Design**: Different layouts for desktop and mobile devices
- **Security**: File type validation, size limits, and secure file serving
- **Database Integration**: Logo settings stored in the application settings system

## Architecture

### Backend Components

#### Models
- **AppSettings**: Stores logo URL and position settings in the database
  - Category: `branding`
  - Keys: `logo_url`, `logo_position`

#### Routes
- **`/api/admin/settings/logo/upload`** (Protected): Logo upload endpoint
- **`/api/admin/settings/logo`** (Protected): Logo removal endpoint  
- **`/api/branding`** (Public): Branding information including logo config
- **`/api/admin/settings/logo/position`** (Protected): Logo position configuration

#### Utilities
- **`utils/logoOperations.js`**: Core business logic for logo processing
- **`utils/imageProcessing.js`**: Image manipulation using Sharp
- **`utils/fileOperations.js`**: File system operations
- **`middleware/uploadMiddleware.js`**: Multer configuration for file uploads
- **`middleware/staticFiles.js`**: Secure static file serving

#### Constants
- **`constants/logoConfig.js`**: Logo specifications and configuration options

### Frontend Components

#### Admin Interface
- **`ThemeConfigSection.vue`**: Logo upload UI and position configuration
- **`AdminSettingsPage.vue`**: Main settings page with logo management

#### Navigation
- **`NavBar.vue`**: Responsive header with dynamic logo positioning

## Configuration

### Logo Specifications

- **Maximum**: 400px × 100px
- **Minimum**: 50px × 50px  
- **File Size**: 5MB maximum
- **Formats**: JPG, PNG, WebP, GIF
- **Output**: PNG format after processing

### Position Options

- **Left**: Logo appears in the left column of the header alongside company name
- **Center**: Logo appears in the center column of the header, company name in left column

## API Endpoints

### Public Endpoints

#### GET `/api/branding`
Returns public branding information including logo URL, position, company name, and logo configuration options.

### Protected Endpoints (Admin Only)

#### POST `/api/admin/settings/logo/upload`
Upload a new logo image via `multipart/form-data` with `logo` field. Returns success status, logo URL, and processing information.

#### DELETE `/api/admin/settings/logo`
Remove the current logo from both filesystem and database.

#### PUT `/api/admin/settings/logo/position`
Update logo position. Accepts `position` field with values "left" or "center".

## Image Processing

### Automatic Processing
1. **File Type Validation**: Ensures uploaded file is a valid image format
2. **Dimension Validation**: Checks minimum size requirements (50x50px)
3. **Automatic Resizing**: Resizes images that exceed maximum dimensions while preserving aspect ratio
4. **Format Conversion**: Converts all logos to PNG format for consistency
5. **Optimization**: Applies compression and optimization settings

### Size Constraints
- **Maximum**: 400px × 100px
- **Minimum**: 50px × 50px
- **File Size**: 5MB maximum
- **Aspect Ratio**: Preserved during resizing

## Security Features

### File Upload Security
- **MIME Type Validation**: Double validation using multer and file-type library
- **File Extension Filtering**: Only image extensions allowed
- **Size Limits**: Enforced at upload middleware level
- **Buffer Processing**: Files processed in memory before saving

### Static File Serving
- **Content-Type Override**: Files served as `application/octet-stream` to prevent execution
- **MIME Sniffing Prevention**: `X-Content-Type-Options: nosniff` header
- **File Extension Filtering**: Only image extensions served
- **Cache Headers**: Appropriate caching for performance

## Responsive Design

### Desktop Layout (>768px)
- **Three-Column Grid**: Logo positioned in left or center column
- **Company Name**: Always visible in left column
- **User Auth**: Right column with logout button

### Mobile Layout (≤768px)
- **Hamburger Menu**: Collapsible navigation
- **Logo + Company Name**: Always together in brand area
- **Position Independence**: Logo position setting doesn't affect mobile layout

## Usage

### For Administrators

1. **Upload Logo**:
   - Navigate to Admin Settings → Theme
   - Click "Choose File" in Logo section
   - Select image file (JPG, PNG, WebP, GIF)
   - Image automatically processed and uploaded

2. **Change Logo Position**:
   - Select "Left side of header" or "Center of header"
   - Position updates immediately

3. **Remove Logo**:
   - Click "Remove Logo" button
   - Logo deleted from server and database

### For Developers

- **Upload**: Send `FormData` with logo file to upload endpoint
- **Position**: Send JSON with position value to position endpoint
- **Authentication**: Include Bearer token in Authorization header

## File Structure

```
├── backend/
│   ├── constants/
│   │   └── logoConfig.js              # Logo specifications
│   ├── middleware/
│   │   ├── uploadMiddleware.js        # Multer configuration
│   │   └── staticFiles.js             # Secure file serving
│   ├── models/
│   │   └── AppSettings.js             # Settings storage
│   ├── routes/
│   │   ├── admin.js                   # Logo management endpoints
│   │   └── branding.js                # Public branding API
│   ├── utils/
│   │   ├── logoOperations.js          # Logo business logic
│   │   ├── imageProcessing.js         # Image manipulation
│   │   └── fileOperations.js          # File system utilities
│   └── uploads/
│       └── logos/                     # Logo storage directory
└── frontend/
    ├── components/
    │   ├── NavBar.vue                 # Navigation with logo display
    │   └── admin/
    │       ├── ThemeConfigSection.vue # Logo upload interface
    │       └── AdminSettingsPage.vue  # Settings management
    └── views/
        └── AdminSettingsPage.vue      # Admin settings page
```

## Database Schema

Logo settings are stored in the `app_settings` table with category `branding`:
- `logo_url`: Path to uploaded logo file
- `logo_position`: "left" or "center"

**AppSettings Model**: This app uses a flexible key-value settings system where settings are categorized (e.g., "branding", "business") and stored as key-value pairs with user tracking and timestamps.

## Error Handling

### Common Errors

#### Upload Errors
- **File too large**: "File size exceeds 5MB limit"
- **Invalid format**: "Only JPG, PNG, WebP files are allowed"
- **Image too small**: "Image is too small. Minimum size is 50x50 pixels"
- **Processing error**: "Error processing image file"

#### Position Errors
- **Invalid position**: "Position must be one of: left, center"
- **Missing position**: "Logo position is required"

Errors return JSON with `error` and `details` fields for user-friendly error messages.

## Testing

### Backend Tests
- **Image Processing**: Validation, resizing, format conversion
- **File Operations**: Upload, save, delete operations
- **API Endpoints**: Upload, position update, retrieval
- **Security**: File type validation, size limits

### Frontend Tests
- **Component Rendering**: Logo upload UI, position selector
- **User Interactions**: File selection, position changes
- **API Integration**: Upload success/error handling
- **Responsive Design**: Desktop/mobile layout switching

## Performance Considerations

### Optimization
- **Image Processing**: Sharp library for efficient image manipulation
- **Caching**: Static file caching headers for logo delivery
- **File Size**: Automatic compression and optimization
- **Memory Usage**: Stream-based processing for large files

### Monitoring
- **Upload Success Rate**: Track successful vs failed uploads
- **File Sizes**: Monitor processed file sizes
- **Performance Metrics**: Image processing times
- **Storage Usage**: Disk space monitoring for uploads directory

## Troubleshooting

### Common Issues

1. **Logo not displaying**:
   - Check file permissions on uploads directory
   - Verify logo URL in database
   - Confirm static file middleware is configured

2. **Upload failing**:
   - Check file size limits
   - Verify image format is supported
   - Ensure uploads directory exists and is writable

3. **Position not updating**:
   - Verify admin permissions
   - Check database connection
   - Confirm frontend is fetching latest branding data

4. **Mobile layout issues**:
   - Clear browser cache
   - Check responsive CSS breakpoints
   - Verify mobile auth section visibility

### Logs to Check
- **Upload errors**: Server logs for multer/sharp errors
- **Database errors**: AppSettings query failures
- **File system errors**: Permission or disk space issues
- **Frontend errors**: Browser console for API failures

## Future Enhancements

### Planned Features
- **Multiple Logo Formats**: Support for different logo variants (light/dark theme)
- **Logo Presets**: Quick selection from predefined logo options
- **Advanced Positioning**: More granular positioning controls
- **Logo Analytics**: Track logo visibility and click-through rates
- **Batch Upload**: Support for uploading multiple logo variants
- **CDN Integration**: External storage for logo files

### Technical Improvements
- **Image Optimization**: WebP format support for better compression
- **Lazy Loading**: Defer logo loading for performance
- **Progressive Upload**: Chunked upload for large files
- **Version Control**: Logo version history and rollback capability
