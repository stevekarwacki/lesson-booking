# Server-Side Theme Injection

## Overview

Eliminates FOUC (Flash of Unstyled Content) by injecting theme colors directly into the HTML `<head>` before JavaScript executes. Users see correct brand colors immediately on all page loads, including first visit.

## How It Works

1. Express middleware intercepts SPA routes
2. Loads theme from database (`app_settings` table, category `theme`)
3. Generates inline `<style>` tag with CSS custom properties
4. Injects into HTML before `</head>` tag
5. Sends modified HTML to client

## Implementation

**Files:**
- `middleware/themeInjection.js` - Middleware with color calculation logic
- `app.js` - Applies middleware to catch-all route
- `frontend/src/composables/useTheme.js` - Client-side updates and fallback

**Generated CSS:**
```css
<style id="theme-variables">
  :root {
    --theme-primary: #28a745;
    --primary-color: #28a745; /* Legacy */
    --theme-primary-hover: #23923d; /* 10% darker */
    --primary-dark: #1e7d34; /* 15% darker */
    --theme-secondary: #20c997;
    --success-color: #20c997; /* Legacy */
    --theme-text-on-primary: #ffffff; /* Auto-calculated */
  }
</style>
```

## Benefits

- Zero FOUC for all users (logged in/out, first/repeat visit)
- No API call needed for initial theme
- SEO-friendly (correct colors for crawlers)
- Server and client use identical color logic

## Caching

- **HTML template**: Cached in memory after first read
- **Theme data**: Loaded from DB on each request (ensures immediate updates)

## Standard Pattern

Use server-side injection for any styling that affects initial page load:
- ✅ Theme colors
- 🔄 Custom fonts (future)
- 🔄 Light/dark mode (future)

## Testing

**Backend:** `tests/theme-injection.test.js`
- Color generation, darkening, contrast calculations

**Manual:**
1. Clear cache → visit site → colors correct immediately
2. Admin changes theme → refresh → new colors applied
3. No color flash during page load

## Development

Requires `frontend/dist/index.html` to exist:
```bash
cd frontend && npm run build && cd .. && npm start
```

