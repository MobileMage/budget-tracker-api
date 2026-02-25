# System Architecture

This document describes the architecture of the Student Budget and Expense Tracking System, covering the high-level design, module organization, request lifecycle, intelligent feature interactions, error handling, and authentication flows.

---

## Table of Contents

- [High-Level Overview](#high-level-overview)
- [Technology Stack](#technology-stack)
- [Module Dependency Map](#module-dependency-map)
- [Project Structure](#project-structure)
- [Request Lifecycle](#request-lifecycle)
- [Intelligent Feature Interactions](#intelligent-feature-interactions)
- [Error Handling Flow](#error-handling-flow)
- [Authentication Flow](#authentication-flow)
- [Scheduled Tasks](#scheduled-tasks)
- [Logging Architecture](#logging-architecture)

---

## High-Level Overview

The system follows a layered architecture built on Node.js and Express.js. Every incoming HTTP request passes through a well-defined pipeline of middleware, reaches a controller for routing logic, delegates to a service for business logic, and interacts with PostgreSQL through the Prisma ORM.

The application is organized into self-contained modules, each responsible for a specific domain (authentication, expenses, budgets, analytics, etc.). Intelligent features such as overspending detection, impulse analysis, and financial forecasting operate as cross-cutting services that are triggered by events in the core modules.

```
┌───────────────────────────────────────────────────────────────────┐
│                          Client Layer                             │
│              (Web App, Mobile App, API Consumers)                 │
└───────────────────────┬───────────────────────────────────────────┘
                        │ HTTPS
                        ▼
┌───────────────────────────────────────────────────────────────────┐
│                       API Gateway Layer                           │
│                                                                   │
│  ┌─────────────┐  ┌──────────┐  ┌───────────┐  ┌─────────────┐  │
│  │ Rate Limiter│  │ CORS     │  │ Morgan     │  │ JSON Parser │  │
│  │             │  │ Handler  │  │ Logger     │  │             │  │
│  └─────────────┘  └──────────┘  └───────────┘  └─────────────┘  │
└───────────────────────┬───────────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────────┐
│                     Application Layer                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    Express Router                         │    │
│  │                                                           │    │
│  │  /api/auth/*      /api/users/*     /api/income/*         │    │
│  │  /api/expenses/*  /api/budgets/*   /api/analytics/*      │    │
│  │  /api/alerts/*    /api/recommendations/*                  │    │
│  │  /api/forecast/*  /api/reports/*   /api/notifications/*   │    │
│  └──────────────────────┬───────────────────────────────────┘    │
│                         │                                         │
│  ┌──────────────────────▼───────────────────────────────────┐    │
│  │               Middleware Pipeline                         │    │
│  │                                                           │    │
│  │  Auth Middleware ──▶ Zod Validator ──▶ Controller         │    │
│  └──────────────────────┬───────────────────────────────────┘    │
│                         │                                         │
│  ┌──────────────────────▼───────────────────────────────────┐    │
│  │                 Service Layer                             │    │
│  │                                                           │    │
│  │  Business logic, cross-service orchestration,             │    │
│  │  intelligent feature triggers                             │    │
│  └──────────────────────┬───────────────────────────────────┘    │
│                         │                                         │
└─────────────────────────┼─────────────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────────────┐
│                       Data Layer                                  │
│                                                                   │
│  ┌──────────────┐              ┌──────────────────────────────┐  │
│  │ Prisma ORM   │◄────────────▶│       PostgreSQL 16+         │  │
│  │ (Client)     │              │                              │  │
│  └──────────────┘              └──────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer           | Technology              | Purpose                                    |
| --------------- | ----------------------- | ------------------------------------------ |
| Runtime         | Node.js 20+             | JavaScript server-side runtime             |
| Framework       | Express.js              | HTTP server and routing                    |
| Database        | PostgreSQL 16+          | Relational data storage                    |
| ORM             | Prisma                  | Type-safe database access and migrations   |
| Authentication  | JWT (jsonwebtoken)      | Stateless access and refresh tokens        |
| Validation      | Zod                     | Runtime schema validation for requests     |
| Testing         | Jest + Supertest        | Unit and integration testing               |
| Documentation   | Swagger / OpenAPI 3.0   | Interactive API documentation              |
| Logging         | Winston + Morgan        | Structured application and HTTP logging    |
| Scheduling      | node-cron               | Periodic task execution                    |
| Containerization| Docker + Docker Compose | Development and production deployment      |

---

## Module Dependency Map

Each module is self-contained with its own routes, controller, service, validator, and tests. Cross-module dependencies flow through the service layer.

```
                    ┌───────────────┐
                    │   Auth Module │
                    │               │
                    │ register      │
                    │ login         │
                    │ refresh       │
                    │ logout        │
                    └───────┬───────┘
                            │ provides JWT
                            │ context to all
                            │ protected modules
                            ▼
        ┌───────────────────────────────────────────┐
        │            Auth Middleware                  │
        │     (extracts & validates JWT token)        │
        └───────────┬───────────────┬───────────────┘
                    │               │
          ┌─────────▼───┐   ┌──────▼────────┐
          │ Users Module│   │ Income Module  │
          │             │   │               │
          │ profile     │   │ CRUD + total  │
          │ password    │   │               │
          │ delete      │   └───────┬───────┘
          └─────────────┘           │
                                    │ income data used by
                                    ▼
        ┌───────────────────────────────────────────┐
        │           Expenses Module                  │
        │                                            │
        │ CRUD + by-category + total                 │
        │                                            │
        │ On create ──▶ triggers Alert Service       │
        │              (overspending + impulse check) │
        └──────┬──────────────┬─────────────────────┘
               │              │
       ┌───────▼───┐  ┌──────▼──────────┐
       │  Budgets  │  │  Alerts Module  │
       │  Module   │  │                 │
       │           │  │ CRUD + unread   │
       │ CRUD +    │  │ count + mark    │
       │ status    │  │ read            │
       └───────────┘  └─────────────────┘
               │
               │ budget + expense data
               │ consumed by
               ▼
  ┌────────────────────────────────────────────────┐
  │              Analytics Module                    │
  │                                                  │
  │ heatmap, category-dominance, spending-trend,     │
  │ summary, weekly-comparison                       │
  └───────┬──────────────────┬──────────────────────┘
          │                  │
  ┌───────▼──────┐  ┌───────▼──────────────┐
  │ Recommenda-  │  │  Forecast Module     │
  │ tions Module │  │                      │
  │              │  │ generate, latest,    │
  │ generate,    │  │ history, health      │
  │ list, delete │  │                      │
  └──────────────┘  │ burn rate calc uses  │
                    │ income + expense data│
                    └──────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Reports Module    │
                    │                    │
                    │ monthly, weekly,   │
                    │ custom, export     │
                    └────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Notifications      │
                    │ Module             │
                    │                    │
                    │ CRUD + unread      │
                    │ count + mark read  │
                    │                    │
                    │ Weekly digest via  │
                    │ node-cron          │
                    └────────────────────┘
```

---

## Project Structure

```
budget-tracker-api/
├── prisma/
│   ├── schema.prisma          # Database schema definition
│   ├── migrations/            # Database migration files
│   └── seed.js                # Database seeding script
├── src/
│   ├── app.js                 # Express app configuration
│   ├── server.js              # Server entry point
│   ├── config/
│   │   └── index.js           # Environment configuration
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication middleware
│   │   ├── validate.js        # Zod validation middleware
│   │   ├── rateLimiter.js     # Rate limiting middleware
│   │   └── errorHandler.js    # Global error handler
│   ├── lib/
│   │   └── prisma.js          # Prisma client singleton
│   ├── utils/
│   │   ├── logger.js          # Winston logger configuration
│   │   ├── response.js        # Standardized response helpers
│   │   └── errors.js          # Custom error classes
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.validator.js
│   │   │   └── auth.test.js
│   │   ├── users/
│   │   ├── income/
│   │   ├── expenses/
│   │   ├── budgets/
│   │   ├── analytics/
│   │   ├── alerts/
│   │   ├── recommendations/
│   │   ├── forecast/
│   │   ├── reports/
│   │   └── notifications/
│   └── cron/
│       └── weeklyDigest.js    # Weekly notification cron job
├── docs/                      # Documentation files
├── .env.example               # Environment variable template
├── .eslintrc.js               # ESLint configuration
├── .prettierrc                # Prettier configuration
├── jest.config.js             # Jest configuration
├── docker-compose.yml         # Docker Compose configuration
├── Dockerfile                 # Application Dockerfile
├── Procfile                   # Process file for PaaS deployment
└── package.json               # Dependencies and scripts
```

---

## Request Lifecycle

Every API request follows a deterministic path through the application layers. The following diagram traces a typical authenticated request from arrival to response.

```
Client Request
    │
    ▼
┌──────────────────────────────────────────────────┐
│ 1. Express Server (server.js)                     │
│    Receives incoming HTTP request                 │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ 2. Global Middleware Pipeline                     │
│                                                   │
│    a. CORS ──▶ Sets cross-origin headers          │
│    b. JSON Parser ──▶ Parses request body         │
│    c. Morgan ──▶ Logs HTTP request details        │
│    d. Rate Limiter ──▶ Checks request frequency   │
│       └── If exceeded: returns 429 immediately    │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ 3. Route Matching (Express Router)               │
│                                                   │
│    Matches URL pattern to module router           │
│    e.g., POST /api/expenses → expenses.routes.js  │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ 4. Route-Level Middleware                         │
│                                                   │
│    a. Auth Middleware (for protected routes)       │
│       ├── Extracts Bearer token from header       │
│       ├── Verifies JWT signature and expiration   │
│       ├── Attaches user context to req.user       │
│       └── If invalid: returns 401 immediately     │
│                                                   │
│    b. Zod Validation Middleware                    │
│       ├── Validates req.body / req.query / params │
│       ├── Applies schema-defined transformations  │
│       └── If invalid: returns 400 with errors     │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ 5. Controller                                     │
│                                                   │
│    ├── Extracts validated data from request        │
│    ├── Calls appropriate service method            │
│    ├── Formats and sends response                  │
│    └── Catches errors and forwards to handler      │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ 6. Service Layer                                  │
│                                                   │
│    ├── Implements business logic                   │
│    ├── Coordinates cross-service operations        │
│    │   (e.g., expense creation triggers alerts)    │
│    ├── Calls Prisma Client for data operations     │
│    └── Throws custom errors for known failures     │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ 7. Prisma ORM                                     │
│                                                   │
│    ├── Translates operations to SQL queries        │
│    ├── Manages connections via connection pool     │
│    ├── Handles transactions where needed           │
│    └── Returns typed results to service layer      │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ 8. PostgreSQL                                     │
│                                                   │
│    Executes SQL, returns result set                │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼ (response bubbles back up)
                   │
┌──────────────────────────────────────────────────┐
│ 9. Response                                       │
│                                                   │
│    Controller formats service result into          │
│    standard response: { success, message, data }   │
│    and sends to client with appropriate status     │
└──────────────────────────────────────────────────┘
```

---

## Intelligent Feature Interactions

The system's intelligent features do not operate in isolation. They are triggered by events in the core CRUD modules and share data through the service layer.

### Expense Creation Trigger Chain

When a new expense is created, it triggers a cascade of intelligence checks:

```
User creates expense
    │
    ▼
┌─────────────────────────────────┐
│ Expense Service: create()       │
│                                  │
│ 1. Save expense to database      │
│ 2. Trigger alert checks (async)  │
└─────────┬───────────────────────┘
          │
          ├──────────────────────────────────────┐
          │                                      │
          ▼                                      ▼
┌─────────────────────────────┐  ┌──────────────────────────────────┐
│ Overspending Detection      │  │ Impulse Spending Detection       │
│                              │  │                                  │
│ 1. Find active budget for    │  │ 1. Count purchases in last 60min │
│    this expense's category   │  │    ── If >= 3: create IMPULSE    │
│ 2. Sum all expenses in       │  │       alert                      │
│    budget period              │  │                                  │
│ 3. Compare to budget limit   │  │ 2. Check if expense was made     │
│    ── If > 110%: create      │  │    between 11pm-2am              │
│       OVERSPEND alert        │  │    ── If yes: create late-night  │
│                              │  │       IMPULSE alert              │
│                              │  │                                  │
│                              │  │ 3. Check if income was received  │
│                              │  │    in last 24 hours              │
│                              │  │    ── If yes and expense is      │
│                              │  │       large: create post-income  │
│                              │  │       IMPULSE alert              │
└──────────────────────────────┘  └──────────────────────────────────┘
```

### Forecast Generation Flow

```
User requests forecast generation
    │
    ▼
┌─────────────────────────────────────┐
│ Forecast Service: generate()        │
│                                      │
│ 1. Calculate total balance           │
│    (sum of income - sum of expenses) │
│                                      │
│ 2. Calculate daily burn rate         │
│    (7-day average daily spending)    │
│                                      │
│ 3. Calculate survival days           │
│    (balance / daily burn rate)       │
│                                      │
│ 4. Determine risk level              │
│    ├── > 30 days: SAFE              │
│    ├── 15-30 days: WARNING          │
│    └── < 15 days: DANGER            │
│                                      │
│ 5. Generate contextual advice        │
│                                      │
│ 6. Save ForecastSnapshot             │
└─────────────────────────────────────┘
```

### Recommendation Generation Flow

```
User requests recommendation generation
    │
    ▼
┌─────────────────────────────────────┐
│ Recommendation Service: generate()   │
│                                      │
│ 1. Fetch user's expense data         │
│ 2. Fetch user's budget data          │
│ 3. Fetch user's income data          │
│ 4. Run rule engine:                  │
│    ├── Category proportion rules     │
│    ├── Budget utilization rules      │
│    ├── Spending velocity rules       │
│    ├── Income-expense ratio rules    │
│    └── Pattern-based rules           │
│ 5. Delete old recommendations        │
│ 6. Save new recommendations          │
└─────────────────────────────────────┘
```

### Weekly Digest Cron Job

```
┌─────────────────────────────────────┐
│ node-cron: Runs every Monday 8 AM   │
│                                      │
│ For each user:                       │
│ 1. Calculate last week's spending    │
│ 2. Compare to previous week          │
│ 3. Identify top spending category    │
│ 4. Check budget statuses             │
│ 5. Create Notification record        │
│    (type: WEEKLY_DIGEST)             │
└─────────────────────────────────────┘
```

---

## Error Handling Flow

The application uses a centralized error handling strategy with custom error classes and a global error handler middleware.

```
Any layer throws error
    │
    ▼
┌─────────────────────────────────────┐
│ Controller catches error             │
│    │                                 │
│    ├── Known error (custom class)?   │
│    │   ├── ValidationError (400)     │
│    │   ├── UnauthorizedError (401)   │
│    │   ├── ForbiddenError (403)      │
│    │   ├── NotFoundError (404)       │
│    │   ├── ConflictError (409)       │
│    │   └── Forwards to error handler │
│    │                                 │
│    └── Unknown error?                │
│        └── Wraps in generic error    │
│            and forwards              │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Global Error Handler Middleware      │
│ (errorHandler.js)                    │
│                                      │
│ 1. Log error with Winston            │
│    ├── Development: full stack trace  │
│    └── Production: message only       │
│                                      │
│ 2. Determine HTTP status code         │
│    ├── From custom error class        │
│    └── Default: 500                   │
│                                      │
│ 3. Format error response              │
│    {                                  │
│      success: false,                  │
│      message: "...",                  │
│      data: null,                      │
│      errors: [...] (if validation)    │
│    }                                  │
│                                      │
│ 4. Send response to client            │
└─────────────────────────────────────┘
```

### Prisma Error Handling

Prisma-specific errors are caught and translated into application-level errors:

| Prisma Error Code | Translation              | HTTP Status |
| ----------------- | ------------------------ | ----------- |
| P2002             | Unique constraint failed | 409 Conflict|
| P2025             | Record not found         | 404 Not Found |
| P2003             | Foreign key constraint   | 400 Bad Request |
| Other P-codes     | Internal server error    | 500         |

---

## Authentication Flow

The system uses a dual-token JWT strategy with short-lived access tokens and long-lived refresh tokens.

### Registration Flow

```
Client                              Server
  │                                    │
  │  POST /api/auth/register           │
  │  { name, email, password,          │
  │    monthlyAllowance }              │
  │───────────────────────────────────▶│
  │                                    │
  │                        ┌───────────┤
  │                        │ 1. Validate input (Zod)
  │                        │ 2. Check email uniqueness
  │                        │ 3. Hash password (bcrypt)
  │                        │ 4. Create User record
  │                        │ 5. Generate access token (15m)
  │                        │ 6. Generate refresh token (7d)
  │                        │ 7. Store hashed refresh token
  │                        └───────────┤
  │                                    │
  │  201 { user, accessToken,          │
  │        refreshToken }              │
  │◀───────────────────────────────────│
```

### Login Flow

```
Client                              Server
  │                                    │
  │  POST /api/auth/login              │
  │  { email, password }               │
  │───────────────────────────────────▶│
  │                                    │
  │                        ┌───────────┤
  │                        │ 1. Find user by email
  │                        │ 2. Compare password hash
  │                        │ 3. Generate new token pair
  │                        │ 4. Store hashed refresh token
  │                        └───────────┤
  │                                    │
  │  200 { user, accessToken,          │
  │        refreshToken }              │
  │◀───────────────────────────────────│
```

### Token Refresh Flow

```
Client                              Server
  │                                    │
  │  POST /api/auth/refresh            │
  │  { refreshToken }                  │
  │───────────────────────────────────▶│
  │                                    │
  │                        ┌───────────┤
  │                        │ 1. Verify refresh token JWT
  │                        │ 2. Find stored token hash
  │                        │ 3. Validate not expired
  │                        │ 4. Delete old refresh token
  │                        │ 5. Generate new token pair
  │                        │ 6. Store new refresh token
  │                        └───────────┤
  │                                    │
  │  200 { accessToken,                │
  │        refreshToken }              │
  │◀───────────────────────────────────│
```

### Protected Request Flow

```
Client                              Server
  │                                    │
  │  GET /api/expenses                 │
  │  Authorization: Bearer <token>     │
  │───────────────────────────────────▶│
  │                                    │
  │                        ┌───────────┤
  │                        │ Auth Middleware:
  │                        │ 1. Extract token from header
  │                        │ 2. Verify JWT signature
  │                        │ 3. Check token expiration
  │                        │ 4. Extract userId from payload
  │                        │ 5. Attach to req.user
  │                        │
  │                        │ If invalid/expired:
  │                        │ └── Return 401 immediately
  │                        └───────────┤
  │                                    │
  │  200 { expenses data }             │
  │◀───────────────────────────────────│
```

### Logout Flow

```
Client                              Server
  │                                    │
  │  POST /api/auth/logout             │
  │  Authorization: Bearer <token>     │
  │  { refreshToken }                  │
  │───────────────────────────────────▶│
  │                                    │
  │                        ┌───────────┤
  │                        │ 1. Verify access token
  │                        │ 2. Find refresh token in DB
  │                        │ 3. Delete refresh token record
  │                        └───────────┤
  │                                    │
  │  200 { message: "Logged out" }     │
  │◀───────────────────────────────────│
```

---

## Scheduled Tasks

The application uses `node-cron` for periodic background tasks.

| Task           | Schedule           | Description                                        |
| -------------- | ------------------ | -------------------------------------------------- |
| Weekly Digest  | Every Monday 8 AM  | Generates a weekly spending summary notification for each user |

The cron scheduler is initialized when the server starts and runs in the same Node.js process. In a production environment with multiple instances, ensure only one instance runs the cron jobs (e.g., via environment flag or distributed lock).

---

## Logging Architecture

The application uses a two-tier logging system:

### Winston (Application Logs)

- **Transports**: Console (development), File (production: `error.log`, `combined.log`)
- **Levels**: error, warn, info, http, debug
- **Format**: JSON with timestamps in production; colorized text in development
- **What is logged**: Application events, service operations, error details, cron job execution

### Morgan (HTTP Logs)

- **Integration**: Piped into Winston as HTTP-level logs
- **Format**: Combined format in production; dev format in development
- **What is logged**: HTTP method, URL, status code, response time, content length

```
Incoming Request
    │
    ├──▶ Morgan: logs HTTP details (method, url, status, time)
    │         │
    │         └──▶ Winston: stores as HTTP-level log entry
    │
    ├──▶ Service Layer: Winston info/debug logs for operations
    │
    └──▶ Error Handler: Winston error logs for failures
              │
              ├──▶ Console Transport (always in development)
              └──▶ File Transport (always in production)
```
