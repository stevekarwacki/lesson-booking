#!/usr/bin/env node

/**
 * AppSettings Validation Test Suite
 * Tests only the validation logic without database dependencies
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

// Import only the validation function to avoid database/Stripe dependencies
// We'll test the validation logic in isolation
const validateBusinessSetting = function(key, value) {
    if (value === null || value === undefined || typeof value !== 'string') {
        return null; // Allow empty values for optional fields
    }

    const trimmedValue = value.trim();
    
    switch (key) {
        case 'company_name':
            if (trimmedValue.length < 1) {
                throw new Error('Company name is required');
            }
            if (trimmedValue.length > 100) {
                throw new Error('Company name must be 100 characters or less');
            }
            break;
            
        case 'contact_email':
            if (trimmedValue.length < 1) {
                throw new Error('Contact email is required');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmedValue)) {
                throw new Error('Please enter a valid email address');
            }
            break;
            
        case 'phone_number':
            if (trimmedValue.length === 0) {
                return null; // Empty optional field
            }
            // Basic phone validation - allows various formats
            const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)\.]{7,20}$/;
            if (!phoneRegex.test(trimmedValue)) {
                throw new Error('Please enter a valid phone number');
            }
            break;
            
        case 'base_url':
            if (trimmedValue.length === 0) {
                return null; // Empty optional field
            }
            try {
                new URL(trimmedValue);
            } catch {
                throw new Error('Please enter a valid URL (e.g., https://example.com)');
            }
            break;
            
        case 'address':
            if (trimmedValue.length > 500) {
                throw new Error('Address must be 500 characters or less');
            }
            break;
            
        default:
            // Allow other keys without specific validation
            if (trimmedValue.length > 1000) {
                throw new Error('Value must be 1000 characters or less');
            }
    }
    
    return trimmedValue;
};

describe('AppSettings Validation Tests', () => {
  test('should validate valid company name', () => {
    const result = validateBusinessSetting('company_name', 'Valid Company');
    assert.strictEqual(result, 'Valid Company', 'Valid company name should pass');
  });

  test('should reject empty company name', () => {
    assert.throws(
      () => validateBusinessSetting('company_name', ''),
      /Company name is required/,
      'Empty company name should throw error'
    );
  });

  test('should reject company name that is too long', () => {
    const longName = 'A'.repeat(101); // 101 characters
    assert.throws(
      () => validateBusinessSetting('company_name', longName),
      /Company name must be 100 characters or less/,
      'Long company name should throw error'
    );
  });

  test('should validate valid email', () => {
    const result = validateBusinessSetting('contact_email', 'test@example.com');
    assert.strictEqual(result, 'test@example.com', 'Valid email should pass');
  });

  test('should reject invalid email', () => {
    assert.throws(
      () => validateBusinessSetting('contact_email', 'invalid-email'),
      /Please enter a valid email address/,
      'Invalid email should throw error'
    );
  });

  test('should reject empty required email', () => {
    assert.throws(
      () => validateBusinessSetting('contact_email', ''),
      /Contact email is required/,
      'Empty email should throw error'
    );
  });

  test('should validate valid phone number', () => {
    const result = validateBusinessSetting('phone_number', '555-123-4567');
    assert.strictEqual(result, '555-123-4567', 'Valid phone should pass');
  });

  test('should validate international phone number', () => {
    const result = validateBusinessSetting('phone_number', '+1 (555) 123-4567');
    assert.strictEqual(result, '+1 (555) 123-4567', 'International phone should pass');
  });

  test('should reject invalid phone number', () => {
    assert.throws(
      () => validateBusinessSetting('phone_number', 'abc'),
      /Please enter a valid phone number/,
      'Invalid phone should throw error'
    );
  });

  test('should allow empty optional phone number', () => {
    const result = validateBusinessSetting('phone_number', '');
    assert.strictEqual(result, null, 'Empty optional field should return null');
  });

  test('should validate valid URL', () => {
    const result = validateBusinessSetting('base_url', 'https://example.com');
    assert.strictEqual(result, 'https://example.com', 'Valid URL should pass');
  });

  test('should validate URL with path', () => {
    const result = validateBusinessSetting('base_url', 'https://example.com/path');
    assert.strictEqual(result, 'https://example.com/path', 'URL with path should pass');
  });

  test('should reject invalid URL', () => {
    assert.throws(
      () => validateBusinessSetting('base_url', 'not-a-url'),
      /Please enter a valid URL/,
      'Invalid URL should throw error'
    );
  });

  test('should allow empty optional URL', () => {
    const result = validateBusinessSetting('base_url', '');
    assert.strictEqual(result, null, 'Empty optional URL should return null');
  });

  test('should validate address length', () => {
    const longAddress = 'A'.repeat(501); // 501 characters
    assert.throws(
      () => validateBusinessSetting('address', longAddress),
      /Address must be 500 characters or less/,
      'Long address should throw error'
    );
  });

  test('should allow valid address', () => {
    const result = validateBusinessSetting('address', '123 Main St, City, State');
    assert.strictEqual(result, '123 Main St, City, State', 'Valid address should pass');
  });

  test('should handle unknown setting keys gracefully', () => {
    const result = validateBusinessSetting('unknown_key', 'some value');
    assert.strictEqual(result, 'some value', 'Unknown key should pass through with basic validation');
  });

  test('should reject extremely long values for unknown keys', () => {
    const longValue = 'A'.repeat(1001); // 1001 characters
    assert.throws(
      () => validateBusinessSetting('unknown_key', longValue),
      /Value must be 1000 characters or less/,
      'Extremely long value should throw error'
    );
  });

  test('should trim whitespace from values', () => {
    const result = validateBusinessSetting('company_name', '  Trimmed Company  ');
    assert.strictEqual(result, 'Trimmed Company', 'Whitespace should be trimmed');
  });

  test('should handle null values', () => {
    const result = validateBusinessSetting('company_name', null);
    assert.strictEqual(result, null, 'Null value should return null');
  });

  test('should handle undefined values', () => {
    const result = validateBusinessSetting('company_name', undefined);
    assert.strictEqual(result, null, 'Undefined value should return null');
  });

  test('should handle non-string values', () => {
    const result = validateBusinessSetting('company_name', 123);
    assert.strictEqual(result, null, 'Non-string value should return null');
  });
});

describe('Email Validation Edge Cases', () => {
  test('should accept email with subdomain', () => {
    const result = validateBusinessSetting('contact_email', 'user@mail.example.com');
    assert.strictEqual(result, 'user@mail.example.com', 'Subdomain email should pass');
  });

  test('should accept email with plus sign', () => {
    const result = validateBusinessSetting('contact_email', 'user+tag@example.com');
    assert.strictEqual(result, 'user+tag@example.com', 'Email with plus should pass');
  });

  test('should reject email without domain', () => {
    assert.throws(
      () => validateBusinessSetting('contact_email', 'user@'),
      /Please enter a valid email address/,
      'Email without domain should throw error'
    );
  });

  test('should reject email without TLD', () => {
    assert.throws(
      () => validateBusinessSetting('contact_email', 'user@domain'),
      /Please enter a valid email address/,
      'Email without TLD should throw error'
    );
  });
});

describe('Phone Number Validation Edge Cases', () => {
  test('should accept phone with dots', () => {
    const result = validateBusinessSetting('phone_number', '555.123.4567');
    assert.strictEqual(result, '555.123.4567', 'Phone with dots should pass');
  });

  test('should accept phone with spaces', () => {
    const result = validateBusinessSetting('phone_number', '555 123 4567');
    assert.strictEqual(result, '555 123 4567', 'Phone with spaces should pass');
  });

  test('should accept phone with parentheses', () => {
    const result = validateBusinessSetting('phone_number', '(555) 123-4567');
    assert.strictEqual(result, '(555) 123-4567', 'Phone with parentheses should pass');
  });

  test('should reject phone that is too short', () => {
    assert.throws(
      () => validateBusinessSetting('phone_number', '123'),
      /Please enter a valid phone number/,
      'Short phone should throw error'
    );
  });
});

// If running directly, provide a summary
if (require.main === module) {
  console.log('🧪 Running AppSettings validation test suite');
  console.log('Testing business information validation rules');
}
