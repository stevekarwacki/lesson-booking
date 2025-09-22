#!/usr/bin/env node

/**
 * Comprehensive test suite for AppSettings feature
 * Tests the model and validation logic using Node.js native test runner
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { AppSettings } = require('../models/AppSettings');
const { sequelize } = require('../db/index');
const { User } = require('../models/User');

// Test setup variables
let testUser = null;

// Setup and cleanup functions
async function setupTestDatabase() {
  try {
    // Ensure tables exist
    await sequelize.sync({ force: false });
    
    // Create a test admin user
    testUser = await User.create({
      firstName: 'Test',
      lastName: 'Admin',
      email: `test-admin-${Date.now()}@example.com`,
      password: 'hashedpassword',
      role: 'admin',
      isActive: true
    });

    return true;
  } catch (error) {
    console.error('Database setup failed:', error.message);
    return false;
  }
}

async function cleanupTestData() {
  try {
    // Clean up test settings
    await AppSettings.destroy({
      where: {
        category: 'business',
        key: ['test_company_name', 'test_contact_email', 'company_name', 'contact_email', 'phone_number', 'base_url', 'address']
      }
    });

    // Clean up test user
    if (testUser) {
      await testUser.destroy();
      testUser = null;
    }
  } catch (error) {
    console.warn('Cleanup warning:', error.message);
  }
}

describe('AppSettings Model Tests', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  test('should create and retrieve a setting', async () => {
    const setting = await AppSettings.setSetting('business', 'test_company_name', 'Test Company Inc', testUser.id);
    
    assert.ok(setting, 'Setting should be created');
    assert.strictEqual(setting.value, 'Test Company Inc', 'Setting value should match');
    
    const retrievedValue = await AppSettings.getSetting('business', 'test_company_name');
    assert.strictEqual(retrievedValue, 'Test Company Inc', 'Retrieved value should match');
  });

  test('should update an existing setting', async () => {
    // Create initial setting
    await AppSettings.setSetting('business', 'test_company_name', 'Initial Company', testUser.id);
    
    // Update the setting
    await AppSettings.setSetting('business', 'test_company_name', 'Updated Company', testUser.id);
    
    const value = await AppSettings.getSetting('business', 'test_company_name');
    assert.strictEqual(value, 'Updated Company', 'Setting should be updated');
  });

  test('should get settings by category', async () => {
    await AppSettings.setSetting('business', 'test_company_name', 'Test Company', testUser.id);
    await AppSettings.setSetting('business', 'test_contact_email', 'test@example.com', testUser.id);
    
    const categorySettings = await AppSettings.getSettingsByCategory('business');
    
    assert.strictEqual(categorySettings.test_company_name, 'Test Company');
    assert.strictEqual(categorySettings.test_contact_email, 'test@example.com');
  });

  test('should set multiple settings in transaction', async () => {
    const multipleSettings = {
      company_name: 'Multi Company',
      contact_email: 'multi@example.com',
      phone_number: '1234567890'
    };

    await AppSettings.setMultipleSettings('business', multipleSettings, testUser.id);
    const retrievedSettings = await AppSettings.getSettingsByCategory('business');
    
    assert.strictEqual(retrievedSettings.company_name, 'Multi Company');
    assert.strictEqual(retrievedSettings.contact_email, 'multi@example.com');
    assert.strictEqual(retrievedSettings.phone_number, '1234567890');
  });

  test('should return null for non-existent setting', async () => {
    const value = await AppSettings.getSetting('business', 'non_existent_key');
    assert.strictEqual(value, null, 'Non-existent setting should return null');
  });
});

describe('AppSettings Validation Tests', () => {
  test('should validate valid company name', () => {
    const result = AppSettings.validateBusinessSetting('company_name', 'Valid Company');
    assert.strictEqual(result, 'Valid Company', 'Valid company name should pass');
  });

  test('should reject empty company name', () => {
    assert.throws(
      () => AppSettings.validateBusinessSetting('company_name', ''),
      /Company name is required/,
      'Empty company name should throw error'
    );
  });

  test('should reject company name that is too long', () => {
    const longName = 'A'.repeat(101); // 101 characters
    assert.throws(
      () => AppSettings.validateBusinessSetting('company_name', longName),
      /Company name must be 100 characters or less/,
      'Long company name should throw error'
    );
  });

  test('should validate valid email', () => {
    const result = AppSettings.validateBusinessSetting('contact_email', 'test@example.com');
    assert.strictEqual(result, 'test@example.com', 'Valid email should pass');
  });

  test('should reject invalid email', () => {
    assert.throws(
      () => AppSettings.validateBusinessSetting('contact_email', 'invalid-email'),
      /Please enter a valid email address/,
      'Invalid email should throw error'
    );
  });

  test('should reject empty required email', () => {
    assert.throws(
      () => AppSettings.validateBusinessSetting('contact_email', ''),
      /Contact email is required/,
      'Empty email should throw error'
    );
  });

  test('should validate valid phone number', () => {
    const result = AppSettings.validateBusinessSetting('phone_number', '555-123-4567');
    assert.strictEqual(result, '555-123-4567', 'Valid phone should pass');
  });

  test('should reject invalid phone number', () => {
    assert.throws(
      () => AppSettings.validateBusinessSetting('phone_number', 'abc'),
      /Please enter a valid phone number/,
      'Invalid phone should throw error'
    );
  });

  test('should allow empty optional phone number', () => {
    const result = AppSettings.validateBusinessSetting('phone_number', '');
    assert.strictEqual(result, null, 'Empty optional field should return null');
  });

  test('should validate valid URL', () => {
    const result = AppSettings.validateBusinessSetting('base_url', 'https://example.com');
    assert.strictEqual(result, 'https://example.com', 'Valid URL should pass');
  });

  test('should reject invalid URL', () => {
    assert.throws(
      () => AppSettings.validateBusinessSetting('base_url', 'not-a-url'),
      /Please enter a valid URL/,
      'Invalid URL should throw error'
    );
  });

  test('should allow empty optional URL', () => {
    const result = AppSettings.validateBusinessSetting('base_url', '');
    assert.strictEqual(result, null, 'Empty optional URL should return null');
  });

  test('should validate address length', () => {
    const longAddress = 'A'.repeat(501); // 501 characters
    assert.throws(
      () => AppSettings.validateBusinessSetting('address', longAddress),
      /Address must be 500 characters or less/,
      'Long address should throw error'
    );
  });

  test('should allow valid address', () => {
    const result = AppSettings.validateBusinessSetting('address', '123 Main St, City, State');
    assert.strictEqual(result, '123 Main St, City, State', 'Valid address should pass');
  });

  test('should handle unknown setting keys gracefully', () => {
    const result = AppSettings.validateBusinessSetting('unknown_key', 'some value');
    assert.strictEqual(result, 'some value', 'Unknown key should pass through with basic validation');
  });

  test('should reject extremely long values for unknown keys', () => {
    const longValue = 'A'.repeat(1001); // 1001 characters
    assert.throws(
      () => AppSettings.validateBusinessSetting('unknown_key', longValue),
      /Value must be 1000 characters or less/,
      'Extremely long value should throw error'
    );
  });
});

describe('AppSettings Edge Cases', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  test('should trim whitespace from string values', async () => {
    await AppSettings.setSetting('business', 'test_company_name', '  Trimmed Company  ', testUser.id);
    const value = await AppSettings.getSetting('business', 'test_company_name');
    assert.strictEqual(value, 'Trimmed Company', 'Whitespace should be trimmed');
  });

  test('should handle null values', async () => {
    const result = AppSettings.validateBusinessSetting('company_name', null);
    assert.strictEqual(result, null, 'Null value should return null');
  });

  test('should handle undefined values', async () => {
    const result = AppSettings.validateBusinessSetting('company_name', undefined);
    assert.strictEqual(result, null, 'Undefined value should return null');
  });

  test('should handle non-string values', async () => {
    const result = AppSettings.validateBusinessSetting('company_name', 123);
    assert.strictEqual(result, null, 'Non-string value should return null');
  });
});

// If running directly, provide a summary
if (require.main === module) {
  console.log('🧪 Running AppSettings test suite with Node.js native test runner');
  console.log('Use: npm run test:backend or node --test tests/app-settings.test.js');
}