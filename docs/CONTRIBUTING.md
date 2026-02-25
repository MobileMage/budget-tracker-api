# Contributing Guide

Thank you for your interest in contributing to the Student Budget and Expense Tracking System. This document covers the conventions, processes, and standards used in this project.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Code Style](#code-style)
- [Branch Naming Convention](#branch-naming-convention)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Module Structure Convention](#module-structure-convention)
- [Adding a New Module Checklist](#adding-a-new-module-checklist)
- [Code Review Guidelines](#code-review-guidelines)

---

## Getting Started

1. Read the [Setup Guide](./SETUP.md) to configure your local development environment.
2. Read the [Architecture Guide](./ARCHITECTURE.md) to understand the system design.
3. Familiarize yourself with the [Testing Guide](./TESTING.md) before writing any code.
4. Review the existing modules in `src/modules/` to understand the established patterns.

---

## Code Style

The project enforces consistent code style through ESLint and Prettier. Both tools run automatically and must pass before code is merged.

### ESLint

ESLint is configured for Node.js/Express development. The configuration is defined in `.eslintrc.js` and includes rules for:

- Error prevention (no unused variables, no undef, etc.)
- Best practices (eqeqeq, no-var, prefer-const, etc.)
- Async/await correctness (no floating promises, proper error handling)

**Run the linter:**

```bash
npm run lint
```

**Auto-fix linting issues:**

```bash
npm run lint:fix
```

### Prettier

Prettier handles all formatting concerns. The configuration is defined in `.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

**Format all files:**

```bash
npm run format
```

### Key Style Rules

- Use `const` by default. Use `let` only when reassignment is necessary. Never use `var`.
- Use `async/await` instead of raw Promises or callbacks.
- Use early returns to reduce nesting.
- Destructure objects and arrays where it improves readability.
- Use meaningful variable and function names. Avoid abbreviations except for widely understood ones (`req`, `res`, `err`, `id`).
- Keep functions focused and small. If a function exceeds 40 lines, consider splitting it.
- Always handle errors explicitly. Never swallow errors silently.

---

## Branch Naming Convention

All branches must follow the pattern `<type>/<short-description>`:

| Prefix      | Purpose                                        | Example                          |
| ----------- | ---------------------------------------------- | -------------------------------- |
| `feature/`  | New feature or capability                      | `feature/export-csv`             |
| `bugfix/`   | Fix for a bug found in development or staging  | `bugfix/incorrect-budget-calc`   |
| `hotfix/`   | Urgent fix for a production issue              | `hotfix/login-token-expiry`      |

### Rules

- Use lowercase letters and hyphens only (no underscores, no spaces).
- Keep descriptions concise but descriptive (2-5 words).
- Branch from `develop` for features and bugfixes.
- Branch from `main` for hotfixes.

### Examples

```
feature/spending-heatmap
feature/weekly-digest-notifications
bugfix/duplicate-alert-creation
bugfix/pagination-off-by-one
hotfix/jwt-secret-validation
```

---

## Commit Message Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Purpose                                                |
| ---------- | ------------------------------------------------------ |
| `feat`     | A new feature visible to the user or API consumer      |
| `fix`      | A bug fix                                              |
| `docs`     | Documentation changes only                             |
| `style`    | Formatting changes (white-space, semicolons, etc.)     |
| `refactor` | Code change that neither fixes a bug nor adds a feature|
| `perf`     | Performance improvement                                |
| `test`     | Adding or correcting tests                             |
| `build`    | Changes to build system or external dependencies       |
| `ci`       | Changes to CI configuration files and scripts          |
| `chore`    | Other changes that don't modify src or test files      |

### Scope

The scope identifies the module or area affected. Use the module name:

`auth`, `users`, `income`, `expenses`, `budgets`, `analytics`, `alerts`, `recommendations`, `forecast`, `reports`, `notifications`, `middleware`, `prisma`, `config`

### Examples

```
feat(expenses): add category filtering to expense list

fix(alerts): prevent duplicate overspend alerts within same budget period

docs(api): update response examples for forecast endpoints

refactor(analytics): extract heatmap calculation to separate function

test(budgets): add tests for budget status edge cases

chore(deps): update prisma to 5.x
```

### Rules

- The description (subject line) must be in lowercase.
- The description must not end with a period.
- The description must be in the imperative mood ("add" not "added" or "adds").
- The subject line must not exceed 72 characters.
- Use the body to explain "what" and "why" when the subject line alone is insufficient.
- Reference issue numbers in the footer when applicable: `Closes #42`.

---

## Pull Request Process

### 1. Before Opening a PR

- Ensure your branch is up to date with the base branch:
  ```bash
  git fetch origin
  git rebase origin/develop
  ```
- Run the full test suite and ensure all tests pass:
  ```bash
  npm test
  ```
- Run the linter and fix any issues:
  ```bash
  npm run lint
  ```
- Run the formatter:
  ```bash
  npm run format
  ```
- Verify test coverage has not decreased:
  ```bash
  npm run test:coverage
  ```

### 2. Opening the PR

- Open a pull request against `develop` (or `main` for hotfixes).
- Write a clear title following the conventional commit format (e.g., `feat(expenses): add CSV export`).
- Fill out the PR description template:

```markdown
## Summary
Brief description of what this PR does and why.

## Changes
- Bullet list of specific changes made

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] Refactoring
- [ ] Test improvement
- [ ] Other (describe)

## Testing
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Coverage has not decreased

## Checklist
- [ ] Code follows the project style guide
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if applicable)
- [ ] No console.log statements left in code
```

### 3. Review Process

- At least one reviewer must approve the PR before merging.
- All CI checks (linting, tests, coverage) must pass.
- Address all review comments before merging.
- Use "Squash and merge" for feature branches to maintain a clean commit history on the main branch.

### 4. After Merging

- Delete the feature branch.
- Verify the CI pipeline passes on the target branch after merge.

---

## Module Structure Convention

Every module follows a consistent five-file structure. This convention must be maintained for all new modules.

```
src/modules/<module-name>/
├── <module-name>.routes.js       # Express router with route definitions
├── <module-name>.controller.js   # Request handling and response formatting
├── <module-name>.service.js      # Business logic and data operations
├── <module-name>.validator.js    # Zod schemas for request validation
└── <module-name>.test.js         # Jest tests (unit + integration)
```

### Layer Responsibilities

**Routes (`*.routes.js`):**
- Define HTTP method, path, and middleware chain for each endpoint.
- Apply auth middleware to protected routes.
- Apply validation middleware with the appropriate Zod schema.
- Delegate to the controller. Routes contain no business logic.

```javascript
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const controller = require('./expenses.controller');
const { createExpenseSchema, queryExpenseSchema } = require('./expenses.validator');

router.post('/', auth, validate(createExpenseSchema), controller.create);
router.get('/', auth, validate(queryExpenseSchema, 'query'), controller.getAll);
// ...

module.exports = router;
```

**Controller (`*.controller.js`):**
- Extracts validated data from `req.body`, `req.params`, `req.query`, and `req.user`.
- Calls the corresponding service method.
- Formats the response using the standard response helper.
- Handles errors via try/catch and passes them to the error handler.

```javascript
const service = require('./expenses.service');
const { sendSuccess, sendCreated } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const expense = await service.create({
      ...req.body,
      userId: req.user.id
    });
    sendCreated(res, 'Expense recorded successfully', expense);
  } catch (error) {
    next(error);
  }
};

module.exports = { create };
```

**Service (`*.service.js`):**
- Contains all business logic for the module.
- Interacts with the database exclusively through Prisma.
- Throws custom errors (NotFoundError, ConflictError, etc.) for known failure cases.
- May call other services for cross-module operations.
- Must not access `req` or `res` objects directly.

```javascript
const prisma = require('../../lib/prisma');
const { NotFoundError } = require('../../utils/errors');

const create = async (data) => {
  const expense = await prisma.expense.create({ data });
  // Trigger alert checks (async, fire-and-forget)
  checkOverspending(expense).catch(() => {});
  checkImpulseSpending(expense).catch(() => {});
  return expense;
};

module.exports = { create };
```

**Validator (`*.validator.js`):**
- Defines Zod schemas for each endpoint's request body or query parameters.
- Handles type coercion (e.g., string to number for query params).
- Provides clear, user-friendly error messages.

```javascript
const { z } = require('zod');

const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200),
  amount: z.number().positive('Amount must be positive'),
  category: z.enum([
    'FOOD', 'TRANSPORT', 'ENTERTAINMENT', 'SHOPPING',
    'UTILITIES', 'HEALTH', 'EDUCATION', 'OTHER'
  ]),
  date: z.string().datetime().optional()
});

module.exports = { createExpenseSchema };
```

**Tests (`*.test.js`):**
- Co-located with the module.
- Tests both the service layer (unit) and route layer (integration).
- Mocks Prisma to avoid database dependencies.
- Follows the patterns described in the [Testing Guide](./TESTING.md).

---

## Adding a New Module Checklist

When adding a new module to the system, complete every item in this checklist:

### Planning

- [ ] Define the module's purpose and scope
- [ ] Identify all endpoints (method, path, auth requirements)
- [ ] Design the Prisma model(s) if new database tables are needed
- [ ] Identify dependencies on existing modules

### Database (if applicable)

- [ ] Add model(s) to `prisma/schema.prisma`
- [ ] Add any new enums to the schema
- [ ] Define appropriate indexes
- [ ] Create a migration: `npx prisma migrate dev --name add_<model_name>`
- [ ] Generate updated Prisma Client: `npx prisma generate`
- [ ] Update the seed script if sample data is needed
- [ ] Document the model in `docs/DATABASE.md`

### Implementation

- [ ] Create the module directory: `src/modules/<module-name>/`
- [ ] Create `<module-name>.validator.js` with Zod schemas for all endpoints
- [ ] Create `<module-name>.service.js` with business logic
- [ ] Create `<module-name>.controller.js` with request handlers
- [ ] Create `<module-name>.routes.js` with route definitions
- [ ] Register routes in the main Express app (`src/app.js`)

### Testing

- [ ] Create `<module-name>.test.js` with comprehensive tests
- [ ] Write unit tests for every service method
- [ ] Write integration tests for every route
- [ ] Test validation error cases
- [ ] Test authentication/authorization cases
- [ ] Test edge cases and error paths
- [ ] Run full test suite and verify no regressions: `npm test`
- [ ] Check that coverage thresholds are maintained: `npm run test:coverage`

### Documentation

- [ ] Add API documentation for all endpoints in `docs/API.md`
- [ ] Update `docs/ARCHITECTURE.md` if the module introduces new patterns
- [ ] Update `docs/FEATURES.md` if the module implements a new feature
- [ ] Add Swagger/OpenAPI annotations for interactive documentation
- [ ] Update the module dependency map if there are cross-module interactions

### Final Checks

- [ ] Run the linter: `npm run lint`
- [ ] Run the formatter: `npm run format`
- [ ] Test manually via curl or Swagger UI
- [ ] Create a pull request following the PR process above

---

## Code Review Guidelines

When reviewing pull requests, evaluate the following:

### Correctness
- Does the code do what it claims to do?
- Are edge cases handled?
- Are errors handled gracefully?

### Security
- Is user input validated and sanitized?
- Are authorization checks in place (users can only access their own data)?
- Are there any SQL injection risks (should not be possible with Prisma, but verify raw queries)?
- Are sensitive fields excluded from responses (e.g., password hashes)?

### Performance
- Are database queries efficient? Look for N+1 query patterns.
- Is pagination implemented for list endpoints?
- Are appropriate indexes used for new query patterns?

### Consistency
- Does the code follow the established module structure?
- Does the code follow the naming conventions?
- Are Zod schemas used for all request validation?
- Is the standard response format used for all responses?

### Testing
- Are there tests for the new code?
- Do the tests cover both happy paths and error paths?
- Are mocks set up correctly?
- Do the tests actually assert meaningful outcomes (not just "it doesn't throw")?

### Documentation
- Are complex algorithms commented?
- Are API docs updated for new/changed endpoints?
- Are commit messages following the conventional format?
