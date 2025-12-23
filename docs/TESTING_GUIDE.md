# Testing Guide

## Overview
This guide covers testing practices and procedures for the lesson booking application, with specific focus on the Business Information feature implementation.

## Test Structure

### Backend Tests
- **Location**: `/tests/`
- **Framework**: Node.js native with custom test runner
- **Coverage**: Models, API endpoints, validation logic

### Frontend Tests  
- **Location**: `/frontend/src/tests/`
- **Framework**: Vitest + Vue Test Utils
- **Coverage**: Vue components, user interactions, integration flows

## Running Tests

### Backend Tests
```bash
# Run AppSettings feature tests
node tests/app-settings.test.js

# Run all backend tests
npm run test:backend
```

### Frontend Tests
```bash
# From frontend directory
cd frontend

# Run all tests
npm run test

# Run with watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm run test business-info.test.js
```

## Test Files

### Backend
- `app-settings.test.js` - AppSettings model and API tests
- `user-management.test.js` - User CRUD, role changes, instructor profiles
- `subscription-management.test.js` - Subscription lifecycle, payment plans
- `vue-query-composables.test.js` - Vue Query composable logic
- `integration-test.js` - CASL permissions integration
- `middleware.test.js` - Authentication middleware
- `permissions.test.js` - Permission system
- `route-permissions.test.js` - Route access control

### Frontend
- `business-info.test.js` - Business Information components
- `attendance.test.js` - Attendance tracking features
- `logo.test.js` - Logo upload functionality
- `router-permissions.test.js` - Frontend route permissions

## Test Coverage Goals

### Backend
- [ ] Model CRUD operations: 100%
- [ ] API endpoint responses: 100% 
- [ ] Validation logic: 100%
- [ ] Error handling: 90%+

### Frontend
- [ ] Component rendering: 100%
- [ ] User interactions: 90%+
- [ ] Form validation: 100%
- [ ] Error states: 90%+

## Continuous Integration

Tests should be run automatically on:
- [ ] Pre-commit hooks
- [ ] Pull request creation
- [ ] Before deployment
- [ ] Scheduled daily runs

## Writing New Tests

### Backend Test Template (with Database)
```javascript
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { sequelize } = require('../db/index');
const { User } = require('../models/User');

describe('Feature Name', () => {
  let testUser;

  beforeEach(async () => {
    // Recreate database tables for clean state
    await sequelize.sync({ force: true });
    
    // Create test data
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'student'
    });
  });

  afterEach(async () => {
    // Drop all tables after test
    await sequelize.drop();
  });

  it('should do something', async () => {
    // Arrange
    const input = { /* ... */ };
    
    // Act
    const result = await someFunction(input);
    
    // Assert
    assert.strictEqual(result.id, testUser.id);
  });
});
```

**Key Points:**
- Use `sequelize.sync({ force: true })` in `beforeEach` to recreate tables
- Use `sequelize.drop()` in `afterEach` to clean up
- Create unique test data (use timestamps for emails to avoid conflicts)
- Test direct model/service interactions, not HTTP endpoints

### Frontend Test Template
```javascript
import { describe, test, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

describe('ComponentName', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(ComponentName, {
      props: { /* test props */ }
    })
  })

  test('renders correctly', () => {
    expect(wrapper.text()).toContain('Expected content')
  })
})
```

## Test Data Management

### Database
- Use separate test database
- Clean up test data after each run
- Use transactions for isolation

### Date and Time Testing
- **Use Date Helpers**: Always use `createDateHelper()`, `today()`, etc. instead of `new Date()`
- **Mock Time Consistently**: Use local time, not UTC, in test mocks
- **Timezone Awareness**: Ensure both mock time and application logic use same timezone reference

```javascript
// Good: Consistent timezone handling
vi.useFakeTimers()
const mockTime = new Date('2025-10-12T11:00:00') // Local time
vi.setSystemTime(mockTime)
const helper = createDateHelper() // Uses mocked time

// Bad: Mixed timezone references
const mockTime = new Date('2025-10-12T11:00:00Z') // UTC time
vi.setSystemTime(mockTime)
const helper = fromString('2025-10-12') // Local time calculation
```

### Mocking
- Mock external API calls
- Mock authentication for unit tests
- Use real auth for integration tests
- Mock system time for date-dependent tests

---

For detailed test examples, see the existing test files in the codebase.

## Vue Query Composable Testing

When testing Vue Query composables, focus on the logic, not the query execution:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ref, computed } from 'vue';
import { useUserSubscription } from '../frontend/src/composables/useUserSubscription';

describe('Vue Query Composables', () => {
  it('should normalize userId from ref', () => {
    const userId = ref(123);
    const { /* query states */ } = useUserSubscription(userId);
    // Test that composable correctly handles ref input
  });

  it('should not run query when userId is null', () => {
    const userId = ref(null);
    const { /* query states */ } = useUserSubscription(userId);
    // Test that query is disabled when userId is null
  });

  it('should handle computed userId', () => {
    const user = ref({ id: 456 });
    const userId = computed(() => user.value?.id);
    const { /* query states */ } = useUserSubscription(userId);
    // Test that composable correctly handles computed input
  });
});
```

**What to Test:**
- Parameter normalization (refs vs raw values)
- Conditional query enabling logic
- Query key construction
- Error handling for expected states (e.g., 404 = no subscription)

**What NOT to Test:**
- Actual API calls (use backend tests for that)
- Vue Query internals (already tested by Tanstack)

## Related Documentation

- [Date Helpers System](DATE_HELPERS_SYSTEM.md) - Comprehensive guide to date handling in tests
- [Attendance Tracking Feature](ATTENDANCE_TRACKING_FEATURE.md) - Example of date helper usage in tests
- [Vue Query Pattern Guide](VUE_QUERY_PATTERN.md) - Vue Query usage patterns and best practices
- [User Management Flow](USER_MANAGEMENT_FLOW.md) - User management system architecture
