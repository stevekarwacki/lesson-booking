const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { AppSettings } = require('../models/AppSettings');
const { validateSlotAgainstBusinessHours } = require('../utils/timeUtils');

describe('Business Hours Availability Feature', () => {
  describe('Business Hours Validation', () => {
    it('should validate standard business hours', () => {
      const validHours = {
        monday: { isOpen: true, open: '09:00', close: '17:00' },
        tuesday: { isOpen: true, open: '09:00', close: '17:00' },
        wednesday: { isOpen: true, open: '09:00', close: '17:00' },
        thursday: { isOpen: true, open: '09:00', close: '17:00' },
        friday: { isOpen: true, open: '09:00', close: '17:00' },
        saturday: { isOpen: false, open: '09:00', close: '17:00' },
        sunday: { isOpen: false, open: '09:00', close: '17:00' }
      };

      // Should not throw
      const result = AppSettings.validateBusinessSetting('business_hours', JSON.stringify(validHours));
      assert.ok(result);
    });

    it('should reject invalid time format', () => {
      const invalidHours = {
        monday: { isOpen: true, open: '25:00', close: '17:00' },
        tuesday: { isOpen: true, open: '09:00', close: '17:00' },
        wednesday: { isOpen: true, open: '09:00', close: '17:00' },
        thursday: { isOpen: true, open: '09:00', close: '17:00' },
        friday: { isOpen: true, open: '09:00', close: '17:00' },
        saturday: { isOpen: false, open: '09:00', close: '17:00' },
        sunday: { isOpen: false, open: '09:00', close: '17:00' }
      };

      assert.throws(() => {
        AppSettings.validateBusinessSetting('business_hours', JSON.stringify(invalidHours));
      }, /open time must be in HH:MM format/);
    });

    it('should reject open time after close time', () => {
      const invalidHours = {
        monday: { isOpen: true, open: '18:00', close: '09:00' },
        tuesday: { isOpen: true, open: '09:00', close: '17:00' },
        wednesday: { isOpen: true, open: '09:00', close: '17:00' },
        thursday: { isOpen: true, open: '09:00', close: '17:00' },
        friday: { isOpen: true, open: '09:00', close: '17:00' },
        saturday: { isOpen: false, open: '09:00', close: '17:00' },
        sunday: { isOpen: false, open: '09:00', close: '17:00' }
      };

      assert.throws(() => {
        AppSettings.validateBusinessSetting('business_hours', JSON.stringify(invalidHours));
      }, /open time must be before close time/);
    });

    it('should accept 24-hour operation', () => {
      const fullDayHours = {
        monday: { isOpen: true, open: '00:00', close: '23:59' },
        tuesday: { isOpen: true, open: '00:00', close: '23:59' },
        wednesday: { isOpen: true, open: '00:00', close: '23:59' },
        thursday: { isOpen: true, open: '00:00', close: '23:59' },
        friday: { isOpen: true, open: '00:00', close: '23:59' },
        saturday: { isOpen: true, open: '00:00', close: '23:59' },
        sunday: { isOpen: true, open: '00:00', close: '23:59' }
      };

      const result = AppSettings.validateBusinessSetting('business_hours', JSON.stringify(fullDayHours));
      assert.ok(result);
    });

    it('should handle closed days', () => {
      const closedDay = {
        monday: { isOpen: true, open: '09:00', close: '17:00' },
        tuesday: { isOpen: true, open: '09:00', close: '17:00' },
        wednesday: { isOpen: true, open: '09:00', close: '17:00' },
        thursday: { isOpen: true, open: '09:00', close: '17:00' },
        friday: { isOpen: true, open: '09:00', close: '17:00' },
        saturday: { isOpen: false, open: '09:00', close: '17:00' },
        sunday: { isOpen: false, open: '09:00', close: '17:00' }
      };

      const result = AppSettings.validateBusinessSetting('business_hours', JSON.stringify(closedDay));
      assert.ok(result);
    });
  });

  describe('Slot Validation Against Business Hours', () => {
    const businessHours = {
      monday: { isOpen: true, open: '09:00', close: '17:00' },
      tuesday: { isOpen: true, open: '10:00', close: '18:00' },
      wednesday: { isOpen: false, open: '09:00', close: '17:00' },
      thursday: { isOpen: true, open: '09:00', close: '17:00' },
      friday: { isOpen: true, open: '09:00', close: '17:00' },
      saturday: { isOpen: false, open: '09:00', close: '17:00' },
      sunday: { isOpen: false, open: '09:00', close: '17:00' }
    };

    it('should accept slots within business hours', () => {
      const result = validateSlotAgainstBusinessHours(
        1, // Monday (0=Sunday, 1=Monday, etc.)
        '09:00',
        '12:00',
        businessHours
      );

      assert.strictEqual(result.valid, true);
    });

    it('should reject slots on closed days', () => {
      const result = validateSlotAgainstBusinessHours(
        3, // Wednesday (closed)
        '09:00',
        '12:00',
        businessHours
      );

      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('closed'));
    });

    it('should reject slots before business hours', () => {
      const result = validateSlotAgainstBusinessHours(
        1, // Monday
        '08:00',
        '09:00',
        businessHours
      );

      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('outside business hours'));
    });

    it('should reject slots after business hours', () => {
      const result = validateSlotAgainstBusinessHours(
        1, // Monday
        '16:00',
        '18:00',
        businessHours
      );

      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('outside business hours'));
    });

    it('should handle different hours per day', () => {
      // Tuesday opens at 10:00
      const resultValid = validateSlotAgainstBusinessHours(
        2, // Tuesday
        '10:00',
        '14:00',
        businessHours
      );

      assert.strictEqual(resultValid.valid, true);

      // Tuesday before 10:00 should be invalid
      const resultInvalid = validateSlotAgainstBusinessHours(
        2, // Tuesday
        '09:00',
        '10:00',
        businessHours
      );

      assert.strictEqual(resultInvalid.valid, false);
    });

    it('should reject slots that span outside business hours', () => {
      const result = validateSlotAgainstBusinessHours(
        1, // Monday
        '16:00',
        '18:00', // Ends after 17:00 close
        businessHours
      );

      assert.strictEqual(result.valid, false);
    });

    it('should accept slots at opening time', () => {
      const result = validateSlotAgainstBusinessHours(
        1, // Monday
        '09:00', // Exactly at opening
        '10:00',
        businessHours
      );

      assert.strictEqual(result.valid, true);
    });

    it('should accept slots ending at closing time', () => {
      const result = validateSlotAgainstBusinessHours(
        1, // Monday
        '16:00',
        '17:00', // Exactly at closing
        businessHours
      );

      assert.strictEqual(result.valid, true);
    });
  });

  describe('Business Hours Retrieval', () => {
    it('should return default hours when not configured', async () => {
      const hours = await AppSettings.getBusinessHours();
      
      assert.ok(hours);
      assert.ok(hours.monday);
      assert.strictEqual(typeof hours.monday.isOpen, 'boolean');
      assert.ok(hours.monday.open);
      assert.ok(hours.monday.close);
    });
  });
});
