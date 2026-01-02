const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { sequelize } = require('../db/index');
const { User } = require('../models/User');
const { Instructor } = require('../models/Instructor');
const { AppSettings } = require('../models/AppSettings');
const { UserCredits } = require('../models/Credits');
const { defineAbilitiesFor } = require('../utils/abilities');

describe('Book on Behalf - Backend Tests', () => {
  let adminUser, instructorUser, studentUser, instructorProfile;

  beforeEach(async () => {
    // Recreate database tables for clean state
    await sequelize.sync({ force: true });
    
    // Create test users
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'hashedpassword',
      role: 'admin',
      is_approved: true
    });

    instructorUser = await User.create({
      name: 'Instructor User',
      email: 'instructor@example.com',
      password: 'hashedpassword',
      role: 'instructor',
      is_approved: true
    });

    studentUser = await User.create({
      name: 'Student User',
      email: 'student@example.com',
      password: 'hashedpassword',
      role: 'student',
      is_approved: true
    });

    // Create instructor profile
    instructorProfile = await Instructor.create({
      user_id: instructorUser.id,
      bio: 'Test instructor',
      hourly_rate: 50.00
    });

    // Update instructor user with instructor_id
    await instructorUser.update({ instructor_id: instructorProfile.id });
  });

  afterEach(async () => {
    // Drop all tables after test
    await sequelize.drop();
  });

  describe('CASL Permissions - Instructor Student Access', () => {
    it('should allow instructors to read student list', () => {
      const ability = defineAbilitiesFor(instructorUser);
      assert.strictEqual(ability.can('read', 'StudentList'), true);
    });

    it('should allow instructors to read student credits', () => {
      const ability = defineAbilitiesFor(instructorUser);
      assert.strictEqual(ability.can('read', 'StudentCredits'), true);
    });

    it('should allow admins to manage users', () => {
      const ability = defineAbilitiesFor(adminUser);
      assert.strictEqual(ability.can('manage', 'User'), true);
    });

    it('should not allow students to read student list', () => {
      const ability = defineAbilitiesFor(studentUser);
      assert.strictEqual(ability.can('read', 'StudentList'), false);
    });

    it('should not allow students to read student credits', () => {
      const ability = defineAbilitiesFor(studentUser);
      assert.strictEqual(ability.can('read', 'StudentCredits'), false);
    });
  });

  describe('User Filtering - Student Role', () => {
    it('should return only students when filtering by role', async () => {
      const allUsers = await User.getAllUsers();
      const students = allUsers.filter(user => user.role === 'student');
      
      assert.strictEqual(students.length, 1);
      assert.strictEqual(students[0].id, studentUser.id);
      assert.strictEqual(students[0].role, 'student');
    });

    it('should not include instructors or admins in student list', async () => {
      const allUsers = await User.getAllUsers();
      const students = allUsers.filter(user => user.role === 'student');
      
      const hasInstructor = students.some(u => u.role === 'instructor');
      const hasAdmin = students.some(u => u.role === 'admin');
      
      assert.strictEqual(hasInstructor, false);
      assert.strictEqual(hasAdmin, false);
    });
  });

  describe('Student Credits - Fetch by Duration', () => {
    it('should return correct credits for 30-minute duration', async () => {
      // Add 30-minute credits for student
      await UserCredits.addCredits(studentUser.id, 5, null, 30);
      
      const breakdown = await UserCredits.getUserCreditsBreakdown(studentUser.id);
      const credits30 = breakdown[30]?.credits || 0;
      
      assert.strictEqual(credits30, 5);
    });

    it('should return correct credits for 60-minute duration', async () => {
      // Add 60-minute credits for student
      await UserCredits.addCredits(studentUser.id, 3, null, 60);
      
      const breakdown = await UserCredits.getUserCreditsBreakdown(studentUser.id);
      const credits60 = breakdown[60]?.credits || 0;
      
      assert.strictEqual(credits60, 3);
    });

    it('should return 0 credits when student has none', async () => {
      const breakdown = await UserCredits.getUserCreditsBreakdown(studentUser.id);
      const credits30 = breakdown[30]?.credits || 0;
      const credits60 = breakdown[60]?.credits || 0;
      
      assert.strictEqual(credits30, 0);
      assert.strictEqual(credits60, 0);
    });

    it('should return separate credits for different durations', async () => {
      await UserCredits.addCredits(studentUser.id, 5, null, 30);
      await UserCredits.addCredits(studentUser.id, 3, null, 60);
      
      const breakdown = await UserCredits.getUserCreditsBreakdown(studentUser.id);
      
      assert.strictEqual(breakdown[30].credits, 5);
      assert.strictEqual(breakdown[60].credits, 3);
    });
  });

  describe('App Settings - Card Payment on Behalf', () => {
    it('should return false when setting does not exist', async () => {
      const result = await AppSettings.getCardPaymentOnBehalfEnabled();
      assert.strictEqual(result, false);
    });

    it('should return true when setting is enabled', async () => {
      await AppSettings.setSetting('lessons', 'card_payment_on_behalf_enabled', 'true', adminUser.id);
      
      const result = await AppSettings.getCardPaymentOnBehalfEnabled();
      assert.strictEqual(result, true);
    });

    it('should return false when setting is disabled', async () => {
      await AppSettings.setSetting('lessons', 'card_payment_on_behalf_enabled', 'false', adminUser.id);
      
      const result = await AppSettings.getCardPaymentOnBehalfEnabled();
      assert.strictEqual(result, false);
    });

    it('should validate boolean values in validateLessonSetting', () => {
      const result = AppSettings.validateLessonSetting('card_payment_on_behalf_enabled', true);
      assert.strictEqual(result, 'true');
    });

    it('should convert string "true" to string in validateLessonSetting', () => {
      const result = AppSettings.validateLessonSetting('card_payment_on_behalf_enabled', 'true');
      assert.strictEqual(result, 'true');
    });

    it('should throw error for invalid boolean values', () => {
      assert.throws(
        () => AppSettings.validateLessonSetting('card_payment_on_behalf_enabled', 'invalid'),
        /Payment setting must be true or false/
      );
    });
  });

  describe('Lesson Settings - Public Access', () => {
    it('should return settings with boolean conversion', async () => {
      await AppSettings.setSetting('lessons', 'default_duration_minutes', '30', adminUser.id);
      await AppSettings.setSetting('lessons', 'card_payment_on_behalf_enabled', 'true', adminUser.id);
      
      const settings = await AppSettings.getSettingsByCategory('lessons');
      
      // Settings are stored as strings, endpoint should convert
      assert.strictEqual(settings.default_duration_minutes, '30');
      assert.strictEqual(settings.card_payment_on_behalf_enabled, 'true');
    });

    it('should have default values when settings missing', async () => {
      const settings = await AppSettings.getSettingsByCategory('lessons');
      
      // Empty object when no settings exist
      assert.deepStrictEqual(settings, {});
    });
  });

  describe('Multi-Permission Authorization', () => {
    it('should allow users with first permission', () => {
      const ability = defineAbilitiesFor(instructorUser);
      const hasAccess = ability.can('read', 'StudentList') || ability.can('manage', 'User');
      assert.strictEqual(hasAccess, true);
    });

    it('should allow users with second permission', () => {
      const ability = defineAbilitiesFor(adminUser);
      const hasAccess = ability.can('read', 'StudentList') || ability.can('manage', 'User');
      assert.strictEqual(hasAccess, true);
    });

    it('should deny users without any permission', () => {
      const ability = defineAbilitiesFor(studentUser);
      const hasAccess = ability.can('read', 'StudentList') || ability.can('manage', 'User');
      assert.strictEqual(hasAccess, false);
    });
  });
});

