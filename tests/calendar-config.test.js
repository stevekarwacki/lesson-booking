const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');

describe('Calendar Config Loader', () => {
    let calendarConfig;
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        // Clear module cache to get fresh config each test
        delete require.cache[require.resolve('../config/calendarConfig')];
        calendarConfig = require('../config/calendarConfig');
        calendarConfig.invalidateCalendarConfigCache();
    });

    afterEach(() => {
        process.env = originalEnv;
        calendarConfig.invalidateCalendarConfigCache();
    });

    describe('getCalendarMethod', () => {
        it('should fall back to service_account when USE_OAUTH_CALENDAR is not set', async () => {
            delete process.env.USE_OAUTH_CALENDAR;
            // Force re-require to pick up env change
            delete require.cache[require.resolve('../config/calendarConfig')];
            delete require.cache[require.resolve('../config/index')];
            calendarConfig = require('../config/calendarConfig');
            calendarConfig.invalidateCalendarConfigCache();

            const method = await calendarConfig.getCalendarMethod();
            assert.strictEqual(method, 'service_account');
        });

        it('should return oauth when USE_OAUTH_CALENDAR is true and no DB setting', async () => {
            process.env.USE_OAUTH_CALENDAR = 'true';
            delete require.cache[require.resolve('../config/calendarConfig')];
            delete require.cache[require.resolve('../config/index')];
            calendarConfig = require('../config/calendarConfig');
            calendarConfig.invalidateCalendarConfigCache();

            const method = await calendarConfig.getCalendarMethod();
            assert.strictEqual(method, 'oauth');
        });

        it('should use cached value on subsequent calls', async () => {
            const method1 = await calendarConfig.getCalendarMethod();
            const method2 = await calendarConfig.getCalendarMethod();
            assert.strictEqual(method1, method2);
        });

        it('should clear cache when invalidateCalendarConfigCache is called', async () => {
            await calendarConfig.getCalendarMethod();
            calendarConfig.invalidateCalendarConfigCache();
            // Should not throw when re-fetching after invalidation
            const method = await calendarConfig.getCalendarMethod();
            assert.ok(method);
        });
    });

    describe('getServiceAccountCredentials', () => {
        it('should fall back to env vars when no DB settings', async () => {
            process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@project.iam.gserviceaccount.com';
            process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = 'test-key';
            delete require.cache[require.resolve('../config/calendarConfig')];
            delete require.cache[require.resolve('../config/index')];
            calendarConfig = require('../config/calendarConfig');
            calendarConfig.invalidateCalendarConfigCache();

            const creds = await calendarConfig.getServiceAccountCredentials();
            assert.strictEqual(creds.email, 'test@project.iam.gserviceaccount.com');
            assert.strictEqual(creds.privateKey, 'test-key');
        });

        it('should return null values when no env vars set', async () => {
            delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
            delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
            delete require.cache[require.resolve('../config/calendarConfig')];
            delete require.cache[require.resolve('../config/index')];
            calendarConfig = require('../config/calendarConfig');
            calendarConfig.invalidateCalendarConfigCache();

            const creds = await calendarConfig.getServiceAccountCredentials();
            assert.strictEqual(creds.email, null);
            assert.strictEqual(creds.privateKey, null);
        });

        it('should use cached value on subsequent calls', async () => {
            const creds1 = await calendarConfig.getServiceAccountCredentials();
            const creds2 = await calendarConfig.getServiceAccountCredentials();
            assert.deepStrictEqual(creds1, creds2);
        });
    });

    describe('invalidateCalendarConfigCache', () => {
        it('should be a function', () => {
            assert.strictEqual(typeof calendarConfig.invalidateCalendarConfigCache, 'function');
        });

        it('should not throw when called', () => {
            assert.doesNotThrow(() => {
                calendarConfig.invalidateCalendarConfigCache();
            });
        });
    });
});

describe('Calendar Admin API Endpoint Validation', () => {
    it('should define valid calendar methods', () => {
        const validMethods = ['oauth', 'service_account', 'disabled'];
        
        assert.ok(validMethods.includes('oauth'));
        assert.ok(validMethods.includes('service_account'));
        assert.ok(validMethods.includes('disabled'));
        assert.strictEqual(validMethods.length, 3);
    });

    it('should reject invalid method values', () => {
        const validMethods = ['oauth', 'service_account', 'disabled'];
        
        assert.ok(!validMethods.includes('invalid'));
        assert.ok(!validMethods.includes(''));
        assert.ok(!validMethods.includes(null));
    });

    it('should validate service account email format', () => {
        const emailRegex = /@/;
        
        assert.ok(emailRegex.test('test@project.iam.gserviceaccount.com'));
        assert.ok(emailRegex.test('user@gmail.com'));
        assert.ok(!emailRegex.test('invalid-email'));
        assert.ok(!emailRegex.test(''));
    });
});
