#!/usr/bin/env node

/**
 * Integration test script for CASL permissions
 * This simulates real-world scenarios to validate the permission system
 */

const { defineAbilitiesFor, can, canBookingAction } = require('../utils/abilities');
const { 
  authorize, 
  authorizeResource, 
  authorizeBooking 
} = require('../middleware/permissions');

// ANSI color codes for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

class PermissionTester {
  constructor() {
    this.testResults = [];
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  test(description, testFn) {
    try {
      const result = testFn();
      if (result === true || result === undefined) {
        this.testResults.push({ description, status: 'PASS' });
        this.log(`✓ ${description}`, 'green');
      } else {
        this.testResults.push({ description, status: 'FAIL', error: 'Test returned false' });
        this.log(`✗ ${description} - Test returned false`, 'red');
      }
    } catch (error) {
      this.testResults.push({ description, status: 'ERROR', error: error.message });
      this.log(`✗ ${description} - ${error.message}`, 'red');
    }
  }

  async asyncTest(description, testFn) {
    try {
      const result = await testFn();
      if (result === true || result === undefined) {
        this.testResults.push({ description, status: 'PASS' });
        this.log(`✓ ${description}`, 'green');
      } else {
        this.testResults.push({ description, status: 'FAIL', error: 'Test returned false' });
        this.log(`✗ ${description} - Test returned false`, 'red');
      }
    } catch (error) {
      this.testResults.push({ description, status: 'ERROR', error: error.message });
      this.log(`✗ ${description} - ${error.message}`, 'red');
    }
  }

  printSummary() {
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;
    const total = this.testResults.length;

    this.log('\n' + '='.repeat(50), 'blue');
    this.log('TEST SUMMARY', 'blue');
    this.log('='.repeat(50), 'blue');
    this.log(`Total Tests: ${total}`);
    this.log(`Passed: ${passed}`, passed > 0 ? 'green' : 'reset');
    this.log(`Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
    this.log(`Errors: ${errors}`, errors > 0 ? 'yellow' : 'reset');
    
    if (failed > 0 || errors > 0) {
      this.log('\nFailed/Error Tests:', 'red');
      this.testResults
        .filter(r => r.status !== 'PASS')
        .forEach(r => this.log(`  - ${r.description}: ${r.error || 'Failed'}`, 'red'));
    }

    return { passed, failed, errors, total };
  }
}

async function runIntegrationTests() {
  const tester = new PermissionTester();
  
  tester.log('Starting CASL Permissions Integration Tests', 'blue');
  tester.log('=' * 50, 'blue');

  // Test data
  const adminUser = { id: 1, role: 'admin' };
  const instructorUser = { id: 2, role: 'instructor', instructor_id: 10 };
  const studentUser = { id: 3, role: 'student' };

  const futureBooking = {
    id: 1,
    student_id: 3,
    instructor_id: 10,
    date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'booked'
  };

  const nearBooking = {
    id: 2,
    student_id: 3,
    instructor_id: 10,
    date: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'booked'
  };

  // Scenario 1: Student booking a lesson
  tester.log('\n📚 Scenario 1: Student Booking Management', 'yellow');
  
  tester.test('Student can create bookings', () => {
    return can(studentUser, 'create', 'Booking');
  });

  tester.test('Student can view own bookings', () => {
    return can(studentUser, 'read', 'Booking', { student_id: 3 });
  });

  tester.test('Student cannot view other student bookings', () => {
    return !can(studentUser, 'read', 'Booking', { student_id: 4 });
  });

  tester.test('Student can reschedule future booking', () => {
    return canBookingAction(studentUser, futureBooking, 'update');
  });

  tester.test('Student cannot reschedule booking within 24 hours', () => {
    return !canBookingAction(studentUser, nearBooking, 'update');
  });

  // Scenario 2: Instructor managing student bookings
  tester.log('\n👨‍🏫 Scenario 2: Instructor Management', 'yellow');

  tester.test('Instructor can view their student bookings', () => {
    return can(instructorUser, 'read', 'Booking', { instructor_id: 10 });
  });

  tester.test('Instructor can edit their student bookings anytime', () => {
    return canBookingAction(instructorUser, nearBooking, 'update');
  });

  tester.test('Instructor cannot edit other instructor bookings', () => {
    const otherBooking = { ...futureBooking, instructor_id: 20 };
    return !can(instructorUser, 'update', 'Booking', otherBooking);
  });

  tester.test('Instructor can manage own availability', () => {
    return can(instructorUser, 'manage', 'Availability', { instructor_id: 10 });
  });

  tester.test('Instructor cannot manage other instructor availability', () => {
    return !can(instructorUser, 'manage', 'Availability', { instructor_id: 20 });
  });

  // Scenario 3: Admin operations
  tester.log('\n👑 Scenario 3: Admin Operations', 'yellow');

  tester.test('Admin can manage all users', () => {
    return can(adminUser, 'manage', 'User');
  });

  tester.test('Admin can edit any booking', () => {
    return canBookingAction(adminUser, nearBooking, 'update');
  });

  tester.test('Admin can manage packages', () => {
    return can(adminUser, 'manage', 'Package');
  });

  tester.test('Admin can access any resource', () => {
    return can(adminUser, 'manage', 'all');
  });

  // Scenario 4: Middleware integration tests
  tester.log('\n🔐 Scenario 4: Middleware Integration', 'yellow');

  const createMockReq = (user, params = {}) => ({ user, params });
  const createMockRes = () => ({
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.jsonData = data; return this; },
    statusCode: 200,
    jsonData: null
  });

  await tester.asyncTest('Authorize middleware allows admin user management', async () => {
    const req = createMockReq(adminUser);
    const res = createMockRes();
    let nextCalled = false;

    const middleware = authorize('manage', 'User');
    await middleware(req, res, () => { nextCalled = true; });

    return nextCalled && res.statusCode === 200;
  });

  await tester.asyncTest('Authorize middleware denies student user management', async () => {
    const req = createMockReq(studentUser);
    const res = createMockRes();
    let nextCalled = false;

    const middleware = authorize('manage', 'User');
    await middleware(req, res, () => { nextCalled = true; });

    return !nextCalled && res.statusCode === 403;
  });

  await tester.asyncTest('AuthorizeBooking middleware enforces 24-hour rule', async () => {
    const req = createMockReq(studentUser, { bookingId: '2' });
    const res = createMockRes();
    let nextCalled = false;

    const getBooking = async () => nearBooking;
    const middleware = authorizeBooking('update', getBooking);
    await middleware(req, res, () => { nextCalled = true; });

    return !nextCalled && res.statusCode === 403 && res.jsonData.reason === 'time_restriction';
  });

  // Scenario 5: Edge cases and error handling
  tester.log('\n⚠️  Scenario 5: Edge Cases', 'yellow');

  tester.test('Handles null user gracefully', () => {
    const ability = defineAbilitiesFor(null);
    return !ability.can('read', 'User');
  });

  tester.test('Handles undefined booking in canBookingAction', () => {
    return !canBookingAction(studentUser, undefined, 'update');
  });

  tester.test('Handles malformed date in booking', () => {
    const badBooking = { ...futureBooking, date: 'invalid-date' };
    // Should not throw an error, just return false
    try {
      return !canBookingAction(studentUser, badBooking, 'update');
    } catch (error) {
      return false; // Should not throw
    }
  });

  // Scenario 6: Real-world workflow simulation
  tester.log('\n🌍 Scenario 6: Real-World Workflow', 'yellow');

  tester.test('Complete student booking workflow', () => {
    // 1. Student creates booking
    const canCreate = can(studentUser, 'create', 'Booking');
    
    // 2. Student can view their booking
    const canView = can(studentUser, 'read', 'Booking', futureBooking);
    
    // 3. Student can reschedule (future booking)
    const canReschedule = canBookingAction(studentUser, futureBooking, 'update');
    
    // 4. Student cannot reschedule near booking
    const cannotRescheduleNear = !canBookingAction(studentUser, nearBooking, 'update');
    
    return canCreate && canView && canReschedule && cannotRescheduleNear;
  });

  tester.test('Complete instructor management workflow', () => {
    // 1. Instructor can view student bookings
    const canViewStudentBookings = can(instructorUser, 'read', 'Booking', futureBooking);
    
    // 2. Instructor can edit any student booking (including near ones)
    const canEditNearBooking = canBookingAction(instructorUser, nearBooking, 'update');
    
    // 3. Instructor can manage availability
    const canManageAvailability = can(instructorUser, 'manage', 'Availability', { instructor_id: 10 });
    
    // 4. Instructor cannot manage other instructor data
    const cannotManageOther = !can(instructorUser, 'manage', 'Availability', { instructor_id: 20 });
    
    return canViewStudentBookings && canEditNearBooking && canManageAvailability && cannotManageOther;
  });

  tester.test('Admin override capabilities', () => {
    // Admin should be able to do everything students and instructors cannot
    const canManageAll = can(adminUser, 'manage', 'all');
    const canEditNearBooking = canBookingAction(adminUser, nearBooking, 'update');
    const canAccessAnyUser = can(adminUser, 'read', 'User', { id: 999 });
    
    return canManageAll && canEditNearBooking && canAccessAnyUser;
  });

  // Print results
  const summary = tester.printSummary();
  
  // Exit with appropriate code
  if (summary.failed > 0 || summary.errors > 0) {
    process.exit(1);
  } else {
    tester.log('\n🎉 All tests passed!', 'green');
    process.exit(0);
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests().catch(error => {
    console.error('Integration test error:', error);
    process.exit(1);
  });
}

module.exports = { PermissionTester, runIntegrationTests };
