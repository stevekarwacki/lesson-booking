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

    describe('Business Hours Validation', () => {
        // Helper to create a fresh copy of valid business hours
        const getValidBusinessHours = () => ({
            monday: { isOpen: true, open: '09:00', close: '17:00' },
            tuesday: { isOpen: true, open: '09:00', close: '17:00' },
            wednesday: { isOpen: true, open: '09:00', close: '17:00' },
            thursday: { isOpen: true, open: '09:00', close: '17:00' },
            friday: { isOpen: true, open: '09:00', close: '17:00' },
            saturday: { isOpen: false, open: '09:00', close: '17:00' },
            sunday: { isOpen: false, open: '09:00', close: '17:00' }
        });

        it('should validate correct business hours object', () => {
            const validBusinessHours = getValidBusinessHours();
            const result = AppSettings.validateBusinessSetting('business_hours', validBusinessHours);
            assert.strictEqual(typeof result, 'string');
            const parsed = JSON.parse(result);
            assert.deepStrictEqual(parsed, validBusinessHours);
        });

        it('should validate business hours from JSON string', () => {
            const validBusinessHours = getValidBusinessHours();
            const jsonString = JSON.stringify(validBusinessHours);
            const result = AppSettings.validateBusinessSetting('business_hours', jsonString);
            assert.strictEqual(typeof result, 'string');
            const parsed = JSON.parse(result);
            assert.deepStrictEqual(parsed, validBusinessHours);
        });

        it('should accept 24-hour business hours', () => {
            const twentyFourHour = getValidBusinessHours();
            twentyFourHour.monday = { isOpen: true, open: '00:00', close: '23:59' };
            
            const result = AppSettings.validateBusinessSetting('business_hours', twentyFourHour);
            const parsed = JSON.parse(result);
            assert.strictEqual(parsed.monday.open, '00:00');
            assert.strictEqual(parsed.monday.close, '23:59');
        });

        it('should accept early morning hours', () => {
            const earlyMorning = getValidBusinessHours();
            earlyMorning.monday = { isOpen: true, open: '06:00', close: '14:00' };
            
            const result = AppSettings.validateBusinessSetting('business_hours', earlyMorning);
            const parsed = JSON.parse(result);
            assert.strictEqual(parsed.monday.open, '06:00');
            assert.strictEqual(parsed.monday.close, '14:00');
        });

        it('should accept late evening hours', () => {
            const lateEvening = getValidBusinessHours();
            lateEvening.friday = { isOpen: true, open: '14:00', close: '22:00' };
            
            const result = AppSettings.validateBusinessSetting('business_hours', lateEvening);
            const parsed = JSON.parse(result);
            assert.strictEqual(parsed.friday.open, '14:00');
            assert.strictEqual(parsed.friday.close, '22:00');
        });

        it('should reject empty business hours', () => {
            assert.throws(() => {
                AppSettings.validateBusinessSetting('business_hours', '');
            }, /Business hours cannot be empty/);
        });

        it('should reject invalid JSON', () => {
            assert.throws(() => {
                AppSettings.validateBusinessSetting('business_hours', 'not valid json');
            }, /Business hours must be valid JSON/);
        });

        it('should reject missing day configuration', () => {
            const incomplete = getValidBusinessHours();
            delete incomplete.monday;
            
            assert.throws(() => {
                AppSettings.validateBusinessSetting('business_hours', incomplete);
            }, /Missing configuration for monday/);
        });

        it('should reject missing isOpen property', () => {
            const invalid = getValidBusinessHours();
            delete invalid.tuesday.isOpen;
            
            assert.throws(() => {
                AppSettings.validateBusinessSetting('business_hours', invalid);
            }, /tuesday: isOpen must be true or false/);
        });

        it('should reject non-boolean isOpen', () => {
            const invalid = getValidBusinessHours();
            invalid.wednesday.isOpen = 'yes';
            
            assert.throws(() => {
                AppSettings.validateBusinessSetting('business_hours', invalid);
            }, /wednesday: isOpen must be true or false/);
        });

        it('should reject missing open time', () => {
            const invalid = getValidBusinessHours();
            delete invalid.thursday.open;
            
            assert.throws(() => {
                AppSettings.validateBusinessSetting('business_hours', invalid);
            }, /thursday: must have open and close times/);
        });

        it('should reject missing close time', () => {
            const invalid = getValidBusinessHours();
            delete invalid.friday.close;
            
            assert.throws(() => {
                AppSettings.validateBusinessSetting('business_hours', invalid);
            }, /friday: must have open and close times/);
        });

        it('should reject invalid time format - missing colon', () => {
            const invalid = getValidBusinessHours();
            invalid.monday.open = '0900';
            
            assert.throws(() => {
                AppSettings.validateBusinessSetting('business_hours', invalid);
            }, /monday: open time must be in HH:MM format/);
        });

        it('should reject invalid time format - single digit hour', () => {
            const invalid = getValidBusinessHours();
            invalid.tuesday.close = '9:00';
            
            assert.throws(() => {
                AppSettings.validateBusinessSetting('business_hours', invalid);
            }, /tuesday: close time must be in HH:MM format/);
        });

        it('should reject invalid hour value', () => {
            const invalid = getValidBusinessHours();
            invalid.wednesday.open = '25:00';
            
            assert.throws(() => {
                AppSettings.validateBusinessSetting('business_hours', invalid);
            }, /wednesday: open time must be in HH:MM format/);
        });

        it('should reject invalid minute value', () => {
            const invalid = getValidBusinessHours();
            invalid.thursday.close = '17:60';
            
            assert.throws(() => {
                AppSettings.validateBusinessSetting('business_hours', invalid);
            }, /thursday: close time must be in HH:MM format/);
        });

        it('should reject open time same as close time', () => {
            const invalid = getValidBusinessHours();
            invalid.friday.open = '09:00';
            invalid.friday.close = '09:00';
            
            assert.throws(() => {
                AppSettings.validateBusinessSetting('business_hours', invalid);
            }, /friday: open time must be before close time/);
        });

        it('should reject open time after close time', () => {
            const invalid = getValidBusinessHours();
            invalid.monday.open = '18:00';
            invalid.monday.close = '09:00';
            
            assert.throws(() => {
                AppSettings.validateBusinessSetting('business_hours', invalid);
            }, /monday: open time must be before close time/);
        });

        it('should allow closed days with any times (times ignored when closed)', () => {
            const closedDay = getValidBusinessHours();
            closedDay.saturday.isOpen = false;
            closedDay.saturday.open = '23:00';
            closedDay.saturday.close = '08:00';  // Invalid if open, but should be ignored
            
            const result = AppSettings.validateBusinessSetting('business_hours', closedDay);
            assert.ok(result);  // Should not throw
        });
    });
});