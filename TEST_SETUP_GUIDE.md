# BusinessBuilder Frontend Testing Setup Guide

## Overview
This guide describes the testing infrastructure for the BusinessBuilder module using React Testing Library and Jest.

## Test Files Created

### 1. Main Component Tests
- **Location**: `src/modules/businessbuilder/__tests__/BusinessBuilder.test.js`
- **Purpose**: Integration tests for the main BusinessBuilder component
- **Coverage**:
  - Component rendering
  - Tab navigation
  - Form validation
  - Business profile management
  - Invoice creation
  - Mini app creation
  - Cost calculation
  - Checklist management
  - AI plan generation
  - Error handling
  - LocalStorage persistence

### 2. Utility Function Tests
- **Location**: `src/modules/businessbuilder/__tests__/utils.test.js`
- **Purpose**: Unit tests for helper functions and validators
- **Coverage**:
  - Currency formatting (formatINR)
  - Number parsing
  - Value validation
  - Slug sanitization
  - Email validation
  - Phone validation
  - GSTIN validation
  - PIN code validation
  - Business plan calculation
  - Form validation logic

### 3. Test Setup
- **Location**: `src/setupTests.js`
- **Purpose**: Global test configuration and mocks
- **Includes**:
  - jest-dom matchers
  - window.matchMedia mock
  - IntersectionObserver mock
  - ResizeObserver mock
  - Console error suppression for known warnings

## Required Dependencies

Add these to your `package.json`:

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "@babel/preset-env": "^7.23.0",
    "@babel/preset-react": "^7.23.0"
  }
}
```

## Jest Configuration

Add to your `package.json` or create `jest.config.js`:

```json
{
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/src/setupTests.js"],
    "moduleNameMapper": {
      "\\.(css|less|scss|sass)$": "identity-obj-proxy",
      "\\.(jpg|jpeg|png|gif|svg)$": "<rootDir>/__mocks__/fileMock.js"
    },
    "transform": {
      "^.+\\.(js|jsx)$": "babel-jest"
    },
    "collectCoverageFrom": [
      "src/**/*.{js,jsx}",
      "!src/index.js",
      "!src/reportWebVitals.js",
      "!src/**/*.test.{js,jsx}"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 70,
        "lines": 70,
        "statements": 70
      }
    }
  }
}
```

## Running Tests

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:verbose": "jest --verbose"
  }
}
```

## Test Execution Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (reruns on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with detailed output
npm run test:verbose

# Run specific test file
npm test BusinessBuilder.test.js

# Run tests matching pattern
npm test -- --testNamePattern="Business Profile"
```

## Test Coverage

The test suite provides coverage for:

### Component Tests
- ✅ Initial rendering and loading states
- ✅ Tab navigation between all sections
- ✅ Form input handling and validation
- ✅ API interaction (mocked with axios)
- ✅ Error handling and display
- ✅ LocalStorage persistence
- ✅ User interactions (clicks, typing, form submission)
- ✅ Conditional rendering based on state

### Utility Tests
- ✅ Currency formatting edge cases
- ✅ Input sanitization and validation
- ✅ Regex pattern matching (email, phone, GSTIN, etc.)
- ✅ Business logic calculations
- ✅ Form validation rules

## Best Practices Implemented

1. **Mocking External Dependencies**
   - Axios for API calls
   - LocalStorage for persistence
   - Window methods (confirm, alert)

2. **User-Centric Testing**
   - Tests use user events and interactions
   - Queries use accessible roles and labels
   - Tests verify user-visible behavior

3. **Async Handling**
   - Proper use of `waitFor` for async operations
   - `findBy` queries for elements that appear asynchronously

4. **Isolation**
   - Each test is independent
   - `beforeEach` cleanup ensures no state leakage
   - Mocks are reset between tests

5. **Readability**
   - Descriptive test names
   - Organized in logical describe blocks
   - Clear assertions

## Testing Guidelines

### Writing New Tests

1. **Test User Behavior, Not Implementation**
   ```javascript
   // ❌ Bad
   expect(component.state.isLoading).toBe(false);
   
   // ✅ Good
   expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
   ```

2. **Use Accessible Queries**
   ```javascript
   // Priority order:
   getByRole()         // Best
   getByLabelText()    // Good for forms
   getByPlaceholderText()
   getByText()
   getByTestId()       // Last resort
   ```

3. **Handle Async Properly**
   ```javascript
   // ✅ Use waitFor for assertions
   await waitFor(() => {
     expect(screen.getByText('Success')).toBeInTheDocument();
   });
   
   // ✅ Use findBy for queries
   const element = await screen.findByText('Loaded data');
   ```

4. **Mock Only What's Necessary**
   ```javascript
   // Mock external dependencies
   axios.get.mockResolvedValue({ data: mockData });
   
   // Don't mock internal application logic
   ```

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**
   - Ensure babel configuration includes React preset
   - Check jest moduleNameMapper for CSS/asset imports

2. **"act() warning"**
   - Wrap state updates in `waitFor()`
   - Use `userEvent` instead of `fireEvent` for user interactions

3. **Tests timing out**
   - Check for unresolved promises
   - Ensure async operations are properly awaited
   - Increase timeout if needed: `jest.setTimeout(10000)`

4. **LocalStorage not working**
   - Ensure mock implementation in test file
   - Clear storage in `beforeEach`

## Coverage Report

After running `npm run test:coverage`, view the HTML report:

```bash
open coverage/lcov-report/index.html
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

## Next Steps

1. **Increase Coverage**
   - Add tests for edge cases
   - Test error boundaries
   - Add snapshot tests for complex UI

2. **Performance Testing**
   - Use React Testing Library's performance utilities
   - Test for unnecessary re-renders

3. **Accessibility Testing**
   - Use jest-axe for automated a11y testing
   - Test keyboard navigation

4. **E2E Testing**
   - Consider Cypress or Playwright for full user flows
   - Test actual API integration

## Resources

- [React Testing Library Docs](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [User Event Documentation](https://testing-library.com/docs/user-event/intro)
