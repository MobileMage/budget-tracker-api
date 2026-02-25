# Testing Guide

This document covers the testing strategy, conventions, and practices used in the Student Budget and Expense Tracking System.

---

## Table of Contents

- [Overview](#overview)
- [Running Tests](#running-tests)
- [Coverage Expectations](#coverage-expectations)
- [Test File Organization](#test-file-organization)
- [Testing Patterns](#testing-patterns)
- [Writing New Tests](#writing-new-tests)
- [Mocking Prisma](#mocking-prisma)
- [Testing Routes with Supertest](#testing-routes-with-supertest)
- [Testing Services](#testing-services)
- [Testing Middleware](#testing-middleware)
- [CI Integration](#ci-integration)
- [Troubleshooting](#troubleshooting)

---

## Overview

The project uses **Jest** as the test runner and assertion library, and **Supertest** for HTTP-level integration tests against Express routes. Tests are co-located with source files for easy navigation and maintenance.

| Tool       | Purpose                                        |
| ---------- | ---------------------------------------------- |
| Jest       | Test runner, assertions, mocking, coverage     |
| Supertest  | HTTP request simulation for route testing      |

---

## Running Tests

### Run All Tests

```bash
npm test
```

This executes all test files matching the pattern `*.test.js` across the project.

### Run Tests with Coverage

```bash
npm run test:coverage
```

This generates a detailed coverage report in the terminal and writes an HTML report to the `coverage/` directory. Open `coverage/lcov-report/index.html` in a browser for an interactive view.

### Run a Specific Test File

```bash
npx jest src/modules/expenses/expenses.test.js
```

### Run Tests in Watch Mode

```bash
npx jest --watch
```

Watch mode re-runs affected tests when files change. Useful during active development.

### Run Tests Matching a Pattern

```bash
npx jest --testPathPattern="auth"
```

This runs all test files whose path contains "auth".

---

## Coverage Expectations

The project targets the following minimum coverage thresholds:

| Metric     | Target  | Description                              |
| ---------- | ------- | ---------------------------------------- |
| Statements | 70%+    | Percentage of code statements executed   |
| Branches   | 65%+    | Percentage of conditional branches taken |
| Functions  | 70%+    | Percentage of functions called           |
| Lines      | 70%+    | Percentage of source lines executed      |

These thresholds are configured in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    statements: 70,
    branches: 65,
    functions: 70,
    lines: 70
  }
}
```

If coverage drops below these thresholds, the test run fails. This ensures that new code is accompanied by adequate tests.

### What to Prioritize for Coverage

1. **Service layer**: Business logic is the most critical layer to test. Aim for 85%+ coverage on services.
2. **Controllers**: Test the happy path and key error paths. Aim for 75%+ coverage.
3. **Middleware**: Test authentication, validation, and error handling. Aim for 80%+ coverage.
4. **Routes**: Integration tests via Supertest cover route-level behavior.
5. **Utilities**: Test helper functions and custom error classes.

---

## Test File Organization

Tests are co-located with their corresponding source files using the `*.test.js` naming convention:

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.routes.js
│   │   ├── auth.controller.js
│   │   ├── auth.service.js
│   │   ├── auth.validator.js
│   │   └── auth.test.js          ← Tests for the auth module
│   ├── expenses/
│   │   ├── expenses.routes.js
│   │   ├── expenses.controller.js
│   │   ├── expenses.service.js
│   │   ├── expenses.validator.js
│   │   └── expenses.test.js      ← Tests for the expenses module
│   └── ...
├── middleware/
│   ├── auth.js
│   ├── auth.test.js               ← Tests for auth middleware
│   ├── errorHandler.js
│   └── errorHandler.test.js       ← Tests for error handler
└── utils/
    ├── response.js
    └── response.test.js            ← Tests for response helpers
```

### Why Co-Location?

- Tests live next to the code they test, making it easy to find and update both together.
- When a module changes, the associated tests are immediately visible.
- Reduces cognitive overhead of navigating a separate `__tests__` directory tree.

---

## Testing Patterns

### Pattern 1: Arrange-Act-Assert (AAA)

Every test follows the AAA structure:

```javascript
describe('ExpenseService', () => {
  describe('create', () => {
    it('should create an expense and return the record', async () => {
      // Arrange: set up test data and mocks
      const expenseData = {
        description: 'Lunch',
        amount: 150.00,
        category: 'FOOD',
        userId: 'user-123'
      };

      prisma.expense.create.mockResolvedValue({
        id: 'expense-1',
        ...expenseData,
        date: new Date(),
        createdAt: new Date()
      });

      // Act: call the function under test
      const result = await expenseService.create(expenseData);

      // Assert: verify the outcome
      expect(result).toHaveProperty('id', 'expense-1');
      expect(result.amount).toBe(150.00);
      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining(expenseData)
      });
    });
  });
});
```

### Pattern 2: Describe-It Nesting

Tests are organized with `describe` blocks for the unit under test and nested `describe` blocks for each method. Individual cases use `it` blocks.

```javascript
describe('BudgetService', () => {
  describe('getStatus', () => {
    it('should return ON_TRACK when spending is below 80%', async () => { ... });
    it('should return WARNING when spending is between 80-100%', async () => { ... });
    it('should return EXCEEDED when spending is above 100%', async () => { ... });
  });

  describe('create', () => {
    it('should create a budget successfully', async () => { ... });
    it('should throw ConflictError for duplicate category-period', async () => { ... });
  });
});
```

### Pattern 3: Setup and Teardown

Use `beforeEach` for per-test setup (especially resetting mocks) and `afterEach`/`afterAll` for cleanup:

```javascript
describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // ... tests
});
```

### Pattern 4: Testing Error Cases

Always test both the happy path and error paths:

```javascript
describe('getById', () => {
  it('should return the expense when it exists', async () => {
    prisma.expense.findUnique.mockResolvedValue(mockExpense);
    const result = await expenseService.getById('expense-1', 'user-123');
    expect(result).toEqual(mockExpense);
  });

  it('should throw NotFoundError when expense does not exist', async () => {
    prisma.expense.findUnique.mockResolvedValue(null);
    await expect(
      expenseService.getById('nonexistent', 'user-123')
    ).rejects.toThrow('Expense not found');
  });

  it('should throw NotFoundError when expense belongs to another user', async () => {
    prisma.expense.findUnique.mockResolvedValue({
      ...mockExpense,
      userId: 'different-user'
    });
    await expect(
      expenseService.getById('expense-1', 'user-123')
    ).rejects.toThrow('Expense not found');
  });
});
```

---

## Writing New Tests

When adding a new feature or module, follow these steps:

### 1. Create the Test File

Create `<module-name>.test.js` in the same directory as the module:

```javascript
// src/modules/myfeature/myfeature.test.js

const request = require('supertest');
const app = require('../../app');
const prisma = require('../../lib/prisma');

// Mock the Prisma client
jest.mock('../../lib/prisma');

describe('MyFeature Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Add test suites here
});
```

### 2. Write Service Tests First

Test the service layer (business logic) before testing routes:

```javascript
const myFeatureService = require('./myfeature.service');

describe('MyFeatureService', () => {
  describe('methodName', () => {
    it('should handle the expected case', async () => {
      // Mock Prisma calls
      // Call the service method
      // Assert the result
    });
  });
});
```

### 3. Write Route Integration Tests

Test the full HTTP request/response cycle using Supertest:

```javascript
describe('MyFeature Routes', () => {
  describe('POST /api/myfeature', () => {
    it('should create a resource and return 201', async () => {
      // Mock auth (see Testing Routes section)
      // Mock Prisma
      // Make HTTP request
      // Assert status code and response body
    });
  });
});
```

### 4. Cover Edge Cases

Think about:
- Missing required fields (validation errors)
- Unauthorized access (no token, expired token)
- Resource not found (404)
- Duplicate resources (409)
- Empty result sets
- Boundary values (zero amounts, maximum pagination limits)

---

## Mocking Prisma

The Prisma client is mocked globally to avoid hitting the database during tests. The mock replaces all Prisma model methods with Jest mock functions.

### Mock Setup

Create or ensure the mock file exists at `src/lib/__mocks__/prisma.js` (or use `jest.mock` inline):

```javascript
// Option A: Manual mock file at src/lib/__mocks__/prisma.js
const { PrismaClient } = require('@prisma/client');

const prisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  expense: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
  },
  income: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn()
  },
  budget: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  alert: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  recommendation: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
  },
  forecastSnapshot: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn()
  },
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn()
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
  },
  $transaction: jest.fn((fn) => fn(prisma))
};

module.exports = prisma;
```

### Using the Mock in Tests

```javascript
// Option B: Inline mock (at the top of the test file)
jest.mock('../../lib/prisma');
const prisma = require('../../lib/prisma');

// In each test, configure the mock behavior:
prisma.expense.findMany.mockResolvedValue([
  { id: '1', description: 'Test', amount: 100, category: 'FOOD' }
]);

prisma.expense.count.mockResolvedValue(1);
```

### Mocking Transactions

For service methods that use Prisma transactions:

```javascript
prisma.$transaction.mockImplementation(async (callback) => {
  return callback(prisma);
});
```

---

## Testing Routes with Supertest

### Basic Route Test

```javascript
const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');

// Generate a valid test token
const testUser = { id: 'user-123', email: 'test@example.com' };
const testToken = jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret', {
  expiresIn: '15m'
});

describe('GET /api/expenses', () => {
  it('should return a list of expenses', async () => {
    prisma.expense.findMany.mockResolvedValue([mockExpense]);
    prisma.expense.count.mockResolvedValue(1);

    const response = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.expenses).toHaveLength(1);
  });

  it('should return 401 without a token', async () => {
    const response = await request(app)
      .get('/api/expenses')
      .expect(401);

    expect(response.body.success).toBe(false);
  });
});
```

### Testing POST Routes with Validation

```javascript
describe('POST /api/expenses', () => {
  it('should return 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${testToken}`)
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.errors).toBeDefined();
  });

  it('should return 201 for valid expense data', async () => {
    prisma.expense.create.mockResolvedValue({
      id: 'expense-1',
      description: 'Lunch',
      amount: 150,
      category: 'FOOD',
      date: new Date(),
      userId: 'user-123'
    });

    // Mock alert check services to prevent side effects
    prisma.budget.findMany.mockResolvedValue([]);
    prisma.expense.findMany.mockResolvedValue([]);

    const response = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        description: 'Lunch',
        amount: 150,
        category: 'FOOD'
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('expense-1');
  });
});
```

---

## Testing Services

Service tests focus on business logic in isolation from HTTP concerns.

```javascript
const expenseService = require('./expenses.service');
const prisma = require('../../lib/prisma');

jest.mock('../../lib/prisma');

describe('ExpenseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getByCategory', () => {
    it('should return expenses grouped by category with percentages', async () => {
      prisma.expense.groupBy.mockResolvedValue([
        { category: 'FOOD', _sum: { amount: 3000 }, _count: { id: 20 } },
        { category: 'TRANSPORT', _sum: { amount: 1000 }, _count: { id: 10 } }
      ]);

      const result = await expenseService.getByCategory('user-123', {
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-28')
      });

      expect(result.categories).toHaveLength(2);
      expect(result.categories[0].percentage).toBeCloseTo(75.0);
      expect(result.grandTotal).toBe(4000);
    });
  });
});
```

---

## Testing Middleware

### Auth Middleware

```javascript
const authMiddleware = require('./auth');
const jwt = require('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should call next() with valid token', () => {
    const token = jwt.sign(
      { id: 'user-123' },
      process.env.JWT_SECRET || 'test-secret'
    );
    req.headers.authorization = `Bearer ${token}`;

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('user-123');
  });

  it('should return 401 with no token', () => {
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 with expired token', () => {
    const token = jwt.sign(
      { id: 'user-123' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '0s' }
    );
    req.headers.authorization = `Bearer ${token}`;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
```

---

## CI Integration

### GitHub Actions Configuration

The test suite is designed to run in CI environments. A typical GitHub Actions workflow:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: budget_tracker_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: npx prisma generate

      - run: npm test
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/budget_tracker_test
          JWT_SECRET: test-jwt-secret-for-ci
          JWT_REFRESH_SECRET: test-refresh-secret-for-ci

      - run: npm run test:coverage
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/budget_tracker_test
          JWT_SECRET: test-jwt-secret-for-ci
          JWT_REFRESH_SECRET: test-refresh-secret-for-ci
```

### CI Notes

- Tests run against mocked Prisma by default, so a real database is not required for unit tests.
- If integration tests need a real database, the GitHub Actions PostgreSQL service provides one.
- The `npm ci` command ensures a clean, reproducible install from `package-lock.json`.
- Coverage reports can be uploaded as artifacts or sent to coverage tracking services (Codecov, Coveralls).

---

## Troubleshooting

### Tests Fail with "Cannot find module"

Ensure all dependencies are installed:

```bash
npm install
npx prisma generate
```

### Mock Not Working

- Verify `jest.mock()` is called at the top level of the test file, before any imports that use the mocked module.
- Ensure `jest.clearAllMocks()` is called in `beforeEach` to reset mock state between tests.

### Timeout Errors

Some async tests may exceed Jest's default timeout (5 seconds). Increase the timeout:

```javascript
it('should handle slow operations', async () => {
  // test code
}, 10000); // 10 second timeout
```

Or globally in `jest.config.js`:

```javascript
testTimeout: 10000
```

### Tests Pass Locally but Fail in CI

- Check that environment variables are set in the CI configuration.
- Ensure `prisma generate` runs before tests in CI (the generated client is not committed to version control).
- Verify Node.js version matches between local and CI environments.

### Snapshot Errors After Intentional Changes

If response structures change intentionally, update snapshots:

```bash
npx jest --updateSnapshot
```

Review the snapshot changes to confirm they match your expectations before committing.
