const { describe, it } = require('node:test');
const assert = require('node:assert');
const { AppSettings } = require('../models/AppSettings');

describe('AppSettings Validation', () => {
    describe('Business Setting Validation', () => {
        it('should validate social media URLs', () => {
            // Test valid URLs
            assert.strictEqual(
                AppSettings.validateBusinessSetting('social_media_facebook', 'https://facebook.com/company'),
                'https://facebook.com/company'
            );
            assert.strictEqual(
                AppSettings.validateBusinessSetting('social_media_youtube', 'https://youtube.com/channel'),
                'https://youtube.com/channel'
            );
            
            // Test empty values (should be allowed)
            assert.strictEqual(
                AppSettings.validateBusinessSetting('social_media_twitter', ''),
                null
            );
        });

        it('should reject invalid social media URLs', () => {
            // Test invalid URL format
            assert.throws(() => {
                AppSettings.validateBusinessSetting('social_media_facebook', 'not-a-url');
            }, /Please enter a valid URL/);

            // Test non-http protocol - this will be caught by the URL constructor first
            assert.throws(() => {
                AppSettings.validateBusinessSetting('social_media_instagram', 'ftp://instagram.com');
            }, /Social media URL must use http or https/);
        });

        it('should validate existing business fields', () => {
            // Test company name validation
            assert.throws(() => {
                AppSettings.validateBusinessSetting('company_name', '');
            }, /Company name is required/);

            // Test email validation
            assert.throws(() => {
                AppSettings.validateBusinessSetting('contact_email', 'invalid-email');
            }, /Please enter a valid email address/);
        });
    });

    describe('In-Person Payment Setting Validation', () => {
        it('should validate boolean in-person payment setting', () => {
            // Test valid boolean values
            assert.strictEqual(
                AppSettings.validateLessonSetting('in_person_payment_enabled', true),
                'true'
            );
            assert.strictEqual(
                AppSettings.validateLessonSetting('in_person_payment_enabled', false),
                'false'
            );

            // Test valid string values
            assert.strictEqual(
                AppSettings.validateLessonSetting('in_person_payment_enabled', 'true'),
                'true'
            );
            assert.strictEqual(
                AppSettings.validateLessonSetting('in_person_payment_enabled', 'false'),
                'false'
            );
        });

        it('should reject invalid in-person payment setting values', () => {
            assert.throws(() => {
                AppSettings.validateLessonSetting('in_person_payment_enabled', 'invalid');
            }, /must be true or false/);

            assert.throws(() => {
                AppSettings.validateLessonSetting('in_person_payment_enabled', 123);
            }, /must be true or false/);
        });

        it('should validate default duration setting', () => {
            // Test valid duration values
            assert.strictEqual(
                AppSettings.validateLessonSetting('default_duration_minutes', 30),
                '30'
            );
            assert.strictEqual(
                AppSettings.validateLessonSetting('default_duration_minutes', '60'),
                '60'
            );

            // Test invalid duration values
            assert.throws(() => {
                AppSettings.validateLessonSetting('default_duration_minutes', 10);
            }, /Duration must be between 15 and 180 minutes/);

            assert.throws(() => {
                AppSettings.validateLessonSetting('default_duration_minutes', 200);
            }, /Duration must be between 15 and 180 minutes/);

            assert.throws(() => {
                AppSettings.validateLessonSetting('default_duration_minutes', 25);
            }, /Invalid duration value/);
        });

        it('should reject unknown lesson settings', () => {
            assert.throws(() => {
                AppSettings.validateLessonSetting('unknown_setting', 'value');
            }, /Unknown lesson setting: unknown_setting/);
        });
    });
});