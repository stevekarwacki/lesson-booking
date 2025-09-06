const { test, describe } = require('node:test');
const assert = require('node:assert');
const { 
  authorize, 
  authorizeResource, 
  authorizeBooking, 
  authorizeUserAccess 
} = require('../middleware/permissions');

describe('Permission Middleware Tests', () => {
  
  // Mock request/response objects
  const createMockReq = (user = null, params = {}, body = {}) => ({
    user,
    params,
    body
  });

  const createMockRes = () => {
    const res = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.jsonData = data;
        return this;
      },
      statusCode: 200,
      jsonData: null
    };
    return res;
  };

  const mockNext = () => {
    let called = false;
    return {
      fn: () => { called = true; },
      wasCalled: () => called
    };
  };

  // Test users
  const adminUser = { id: 1, role: 'admin' };
  const instructorUser = { id: 2, role: 'instructor', instructor_id: 10 };
  const studentUser = { id: 3, role: 'student' };

  describe('authorize() middleware', () => {
    test('allows admin to manage users', () => {
      const req = createMockReq(adminUser);
      const res = createMockRes();
      const next = mockNext();

      const middleware = authorize('manage', 'User');
      middleware(req, res, next.fn);

      assert.strictEqual(next.wasCalled(), true);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(req.ability);
    });

    test('denies student from managing users', () => {
      const req = createMockReq(studentUser);
      const res = createMockRes();
      const next = mockNext();

      const middleware = authorize('manage', 'User');
      middleware(req, res, next.fn);

      assert.strictEqual(next.wasCalled(), false);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.jsonData.error, 'Permission denied');
    });

    test('denies unauthenticated access', () => {
      const req = createMockReq(null);
      const res = createMockRes();
      const next = mockNext();

      const middleware = authorize('read', 'User');
      middleware(req, res, next.fn);

      assert.strictEqual(next.wasCalled(), false);
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.jsonData.error, 'Authentication required');
    });
  });

  describe('authorizeResource() middleware', () => {
    test('allows access to owned resource', async () => {
      const req = createMockReq(studentUser, { bookingId: '1' });
      const res = createMockRes();
      const next = mockNext();

      const getBooking = async (req) => ({
        id: 1,
        student_id: 3,
        instructor_id: 10,
        status: 'booked'
      });

      const middleware = authorizeResource('read', 'Booking', getBooking);
      await middleware(req, res, next.fn);

      assert.strictEqual(next.wasCalled(), true);
      assert.ok(req.resource);
      assert.ok(req.ability);
    });

    test('denies access to unowned resource', async () => {
      const req = createMockReq(studentUser, { bookingId: '1' });
      const res = createMockRes();
      const next = mockNext();

      const getBooking = async (req) => ({
        id: 1,
        student_id: 999, // Different student
        instructor_id: 10,
        status: 'booked'
      });

      const middleware = authorizeResource('read', 'Booking', getBooking);
      await middleware(req, res, next.fn);

      assert.strictEqual(next.wasCalled(), false);
      assert.strictEqual(res.statusCode, 403);
    });

    test('handles resource not found', async () => {
      const req = createMockReq(studentUser, { bookingId: '999' });
      const res = createMockRes();
      const next = mockNext();

      const getBooking = async (req) => null;

      const middleware = authorizeResource('read', 'Booking', getBooking);
      await middleware(req, res, next.fn);

      assert.strictEqual(next.wasCalled(), false);
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.jsonData.error, 'Resource not found');
    });
  });

  describe('authorizeBooking() middleware', () => {
    test('allows student to update future booking', async () => {
      const req = createMockReq(studentUser, { bookingId: '1' });
      const res = createMockRes();
      const next = mockNext();

      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
      const getBooking = async (req) => ({
        id: 1,
        student_id: 3,
        instructor_id: 10,
        date: futureDate,
        status: 'booked'
      });

      const middleware = authorizeBooking('update', getBooking);
      await middleware(req, res, next.fn);

      assert.strictEqual(next.wasCalled(), true);
      assert.ok(req.booking);
    });

    test('denies student from updating booking within 24 hours', async () => {
      const req = createMockReq(studentUser, { bookingId: '1' });
      const res = createMockRes();
      const next = mockNext();

      const nearDate = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().split('T')[0];
      const getBooking = async (req) => ({
        id: 1,
        student_id: 3,
        instructor_id: 10,
        date: nearDate,
        status: 'booked'
      });

      const middleware = authorizeBooking('update', getBooking);
      await middleware(req, res, next.fn);

      assert.strictEqual(next.wasCalled(), false);
      assert.strictEqual(res.statusCode, 403);
      assert.ok(res.jsonData.error.includes('24 hours'));
      assert.strictEqual(res.jsonData.reason, 'time_restriction');
    });

    test('allows instructor to update any booking regardless of time', async () => {
      const req = createMockReq(instructorUser, { bookingId: '1' });
      const res = createMockRes();
      const next = mockNext();

      const nearDate = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString().split('T')[0];
      const getBooking = async (req) => ({
        id: 1,
        student_id: 3,
        instructor_id: 10, // Instructor's booking
        date: nearDate,
        status: 'booked'
      });

      const middleware = authorizeBooking('update', getBooking);
      await middleware(req, res, next.fn);

      assert.strictEqual(next.wasCalled(), true);
    });
  });

  describe('authorizeUserAccess() middleware', () => {
    test('allows user to access own data', async () => {
      const req = createMockReq(studentUser, { userId: '3' });
      const res = createMockRes();
      const next = mockNext();

      const getUserId = async (req) => parseInt(req.params.userId);

      const middleware = authorizeUserAccess(getUserId);
      await middleware(req, res, next.fn);

      assert.strictEqual(next.wasCalled(), true);
    });

    test('allows admin to access any user data', async () => {
      const req = createMockReq(adminUser, { userId: '999' });
      const res = createMockRes();
      const next = mockNext();

      const getUserId = async (req) => parseInt(req.params.userId);

      const middleware = authorizeUserAccess(getUserId);
      await middleware(req, res, next.fn);

      assert.strictEqual(next.wasCalled(), true);
      assert.strictEqual(req.targetUserId, 999);
    });

    test('denies student from accessing other user data', async () => {
      const req = createMockReq(studentUser, { userId: '999' });
      const res = createMockRes();
      const next = mockNext();

      const getUserId = async (req) => parseInt(req.params.userId);

      const middleware = authorizeUserAccess(getUserId);
      await middleware(req, res, next.fn);

      assert.strictEqual(next.wasCalled(), false);
      assert.strictEqual(res.statusCode, 403);
    });
  });

  describe('Error Handling', () => {
    test('handles errors in resource fetching', async () => {
      const req = createMockReq(studentUser, { bookingId: '1' });
      const res = createMockRes();
      const next = mockNext();

      const getBooking = async (req) => {
        throw new Error('Database error');
      };

      const middleware = authorizeResource('read', 'Booking', getBooking);
      await middleware(req, res, next.fn);

      assert.strictEqual(next.wasCalled(), false);
      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.jsonData.error, 'Error checking permissions');
    });
  });
});
