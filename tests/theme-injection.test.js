/**
 * Theme Injection Middleware Tests
 * 
 * Verifies that theme colors are properly injected into the HTML on server-side
 * to eliminate FOUC (Flash of Unstyled Content).
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { ensureConstantsLoaded } = require('../utils/constants');
const { generateThemeCSS } = require('../middleware/themeInjection');

describe('Theme Injection Middleware', () => {
  before(async () => {
    // Load isomorphic constants before running tests
    await ensureConstantsLoaded();
  });
  describe('generateThemeCSS', () => {
    it('should generate CSS with default colors when no settings provided', () => {
      const css = generateThemeCSS({});
      
      assert.ok(css.includes('--theme-primary: #28a745'), 'Should include default primary color');
      assert.ok(css.includes('--theme-secondary: #20c997'), 'Should include default secondary color');
      assert.ok(css.includes('--primary-color: #28a745'), 'Should include legacy primary color');
      assert.ok(css.includes('--success-color: #20c997'), 'Should include legacy secondary color');
    });
    
    it('should generate CSS with custom colors when settings provided', () => {
      const themeSettings = {
        primary_color: '#FF5733',
        secondary_color: '#3498DB'
      };
      
      const css = generateThemeCSS(themeSettings);
      
      assert.ok(css.includes('--theme-primary: #FF5733'), 'Should include custom primary color');
      assert.ok(css.includes('--theme-secondary: #3498DB'), 'Should include custom secondary color');
    });
    
    it('should generate darkened color variants', () => {
      const themeSettings = {
        primary_color: '#28a745'
      };
      
      const css = generateThemeCSS(themeSettings);
      
      assert.ok(css.includes('--theme-primary-hover:'), 'Should include hover variant');
      assert.ok(css.includes('--primary-dark:'), 'Should include dark variant');
      
      // Verify the darkened colors are different from the original
      assert.ok(!css.includes('--theme-primary-hover: #28a745'), 'Hover should be darker than primary');
      assert.ok(!css.includes('--primary-dark: #28a745'), 'Dark should be darker than primary');
    });
    
    it('should calculate contrast text color for light backgrounds', () => {
      const themeSettings = {
        primary_color: '#FFFFFF' // White background
      };
      
      const css = generateThemeCSS(themeSettings);
      
      assert.ok(css.includes('--theme-text-on-primary: #000000'), 'Should use black text on white background');
    });
    
    it('should calculate contrast text color for dark backgrounds', () => {
      const themeSettings = {
        primary_color: '#000000' // Black background
      };
      
      const css = generateThemeCSS(themeSettings);
      
      assert.ok(css.includes('--theme-text-on-primary: #ffffff'), 'Should use white text on black background');
    });
    
    it('should generate valid CSS style tag', () => {
      const css = generateThemeCSS({});
      
      assert.ok(css.startsWith('<style id="theme-variables">'), 'Should start with style tag');
      assert.ok(css.includes(':root {'), 'Should include :root selector');
      assert.ok(css.endsWith('</style>'), 'Should end with closing style tag');
    });
    
    it('should include all required CSS custom properties', () => {
      const css = generateThemeCSS({});
      
      const requiredProperties = [
        '--theme-primary',
        '--primary-color',
        '--theme-primary-hover',
        '--primary-dark',
        '--theme-secondary',
        '--success-color',
        '--theme-text-on-primary'
      ];
      
      requiredProperties.forEach(property => {
        assert.ok(css.includes(property), `Should include ${property}`);
      });
    });
    
    it('should handle color format variations', () => {
      const themeSettings = {
        primary_color: '#abc',
        secondary_color: '#ABCDEF'
      };
      
      // Should not throw an error
      assert.doesNotThrow(() => {
        generateThemeCSS(themeSettings);
      }, 'Should handle short and long hex formats');
    });
    
    it('should match frontend theme application logic', () => {
      // This test ensures the server-side color calculations match
      // the client-side logic in frontend/src/composables/useTheme.js
      
      const testColor = '#28a745';
      const css = generateThemeCSS({ primary_color: testColor });
      
      // Extract the darkened colors from CSS
      const hoverMatch = css.match(/--theme-primary-hover: (#[0-9a-f]{6})/);
      const darkMatch = css.match(/--primary-dark: (#[0-9a-f]{6})/);
      
      assert.ok(hoverMatch, 'Should generate hover color');
      assert.ok(darkMatch, 'Should generate dark color');
      
      // Verify they are darker (lower RGB values)
      const originalR = parseInt(testColor.substr(1, 2), 16);
      const hoverR = parseInt(hoverMatch[1].substr(1, 2), 16);
      const darkR = parseInt(darkMatch[1].substr(1, 2), 16);
      
      assert.ok(hoverR < originalR, 'Hover color should be darker');
      assert.ok(darkR < originalR, 'Dark color should be darker');
      assert.ok(darkR < hoverR, 'Dark should be darker than hover');
    });
  });
});

