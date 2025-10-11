const { describe, it } = require('node:test');
const assert = require('node:assert');
const { AppSettings } = require('../models/AppSettings');

describe('AppSettings Validation', () => {
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