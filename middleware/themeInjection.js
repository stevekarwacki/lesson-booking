/**
 * Theme Injection Middleware
 * 
 * Injects theme CSS variables directly into the HTML <head> on every page load.
 * This eliminates FOUC (Flash of Unstyled Content) by ensuring theme colors
 * are available before any JavaScript executes.
 * 
 * Flow:
 * 1. Server loads theme from database
 * 2. Generates inline <style> with CSS custom properties
 * 3. Injects into HTML before sending to client
 * 4. Client sees styled content immediately (zero FOUC)
 */

const fs = require('fs');
const path = require('path');
const { AppSettings } = require('../models/AppSettings');
const { getThemeDefaults } = require('../utils/constants');

/**
 * Cache for the HTML template to avoid file reads on every request
 */
let htmlTemplateCache = null;

/**
 * Load and cache the HTML template
 */
function loadHTMLTemplate() {
  if (!htmlTemplateCache) {
    const htmlPath = path.join(__dirname, '../frontend/dist/index.html');
    
    // Check if the file exists (important for development)
    if (!fs.existsSync(htmlPath)) {
      throw new Error(
        'frontend/dist/index.html not found. Please run "npm run build" in the frontend directory first.'
      );
    }
    
    htmlTemplateCache = fs.readFileSync(htmlPath, 'utf-8');
  }
  return htmlTemplateCache;
}

/**
 * Generate inline CSS for theme variables
 * This duplicates the logic from frontend/src/composables/useTheme.js
 * to ensure consistency between server-rendered and client-applied themes.
 */
function generateThemeCSS(themeSettings) {
  const themeDefaults = getThemeDefaults();
  const primaryColor = themeSettings.primary_color || themeDefaults.primary_color;
  const secondaryColor = themeSettings.secondary_color || themeDefaults.secondary_color;
  
  // Helper function to darken a color (matches frontend logic)
  function darkenColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - amount));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - amount));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - amount));
    
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
  }
  
  // Helper function to calculate contrast text color (matches frontend logic)
  function getContrastText(backgroundColor) {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
  
  const primaryHover = darkenColor(primaryColor, 0.1);
  const primaryDark = darkenColor(primaryColor, 0.15);
  const textOnPrimary = getContrastText(primaryColor);
  
  return `
    <style id="theme-variables">
      :root {
        /* Primary theme colors */
        --theme-primary: ${primaryColor};
        --primary-color: ${primaryColor}; /* Legacy compatibility */
        --theme-primary-hover: ${primaryHover};
        --primary-dark: ${primaryDark}; /* Legacy compatibility */
        
        /* Secondary theme colors */
        --theme-secondary: ${secondaryColor};
        --success-color: ${secondaryColor}; /* Legacy compatibility */
        
        /* Auto-calculated accessibility colors */
        --theme-text-on-primary: ${textOnPrimary};
      }
    </style>
  `.trim();
}

/**
 * Middleware to inject theme into HTML
 * 
 * This middleware intercepts requests for the SPA's index.html and injects
 * theme CSS before sending the response. The theme is loaded once per request
 * (not cached) to ensure it's always up-to-date with database changes.
 */
async function injectThemeMiddleware(req, res, next) {
  // Only intercept requests that would serve index.html (SPA catch-all routes)
  // Skip API routes, static assets, etc.
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return next();
  }
  
  try {
    // Load theme settings from database
    const themeSettings = await AppSettings.getSettingsByCategory('theme');
    
    // Load HTML template
    const htmlTemplate = loadHTMLTemplate();
    
    // Generate theme CSS
    const themeCSS = generateThemeCSS(themeSettings);
    
    // Inject theme CSS into <head> (right after <meta> tags, before title)
    const injectedHTML = htmlTemplate.replace(
      '</head>',
      `${themeCSS}\n  </head>`
    );
    
    // Send the modified HTML
    res.send(injectedHTML);
  } catch (error) {
    console.error('Error injecting theme:', error);
    // Fallback: serve original HTML without theme injection
    next();
  }
}

/**
 * Clear HTML template cache (useful in development or after deployments)
 */
function clearCache() {
  htmlTemplateCache = null;
}

module.exports = {
  injectThemeMiddleware,
  clearCache,
  generateThemeCSS // Exported for testing
};

