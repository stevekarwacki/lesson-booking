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
- `integration-test.js` - CASL permissions integration
- `middleware.test.js` - Authentication middleware
- `permissions.test.js` - Permission system
- `route-permissions.test.js` - Route access control

### Frontend
- `business-info.test.js` - Business Information components
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

### Backend Test Template
```javascript
describe('Feature Name', () => {
  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup test data
  });

  test('should do something', async () => {
    // Arrange
    // Act  
    // Assert
  });
});
```

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

### Mocking
- Mock external API calls
- Mock authentication for unit tests
- Use real auth for integration tests

---

For detailed test examples, see the existing test files in the codebase.
