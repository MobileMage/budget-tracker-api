# API Reference

Complete reference for the Student Budget and Expense Tracking System REST API. All endpoints return JSON responses in the standardized format described below.

---

## Table of Contents

- [Base URL](#base-url)
- [Standard Response Format](#standard-response-format)
- [Authentication](#authentication)
- [Modules](#modules)
  - [Auth](#auth)
  - [Users](#users)
  - [Income](#income)
  - [Expenses](#expenses)
  - [Budgets](#budgets)
  - [Analytics](#analytics)
  - [Alerts](#alerts)
  - [Recommendations](#recommendations)
  - [Forecast](#forecast)
  - [Reports](#reports)
  - [Notifications](#notifications)
- [Error Codes](#error-codes)

---

## Base URL

```
http://localhost:3000/api
```

All routes below are relative to this base URL. In production, replace with your deployed domain.

---

## Standard Response Format

Every API response follows this structure:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { }
}
```

| Field     | Type    | Description                                    |
| --------- | ------- | ---------------------------------------------- |
| `success` | boolean | `true` if the request succeeded, `false` otherwise |
| `message` | string  | Human-readable description of the result       |
| `data`    | any     | Response payload (object, array, or null)      |

Error responses include additional detail:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

---

## Authentication

Protected routes require a valid JWT access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Access tokens expire after 15 minutes by default. Use the refresh endpoint to obtain a new access token without re-authenticating.

---

## Modules

### Auth

Handles user registration, login, token refresh, and logout.

---

#### POST /api/auth/register

Create a new user account.

| Property | Value |
| -------- | ----- |
| **Auth Required** | No |

**Request Body:**

```json
{
  "name": "Jane Doe",
  "email": "jane@university.edu",
  "password": "SecurePass123!",
  "monthlyAllowance": 5000.00,
  "allowanceCycle": "MONTHLY"
}
```

| Field              | Type   | Required | Description                                      |
| ------------------ | ------ | -------- | ------------------------------------------------ |
| `name`             | string | Yes      | Full name (2-100 characters)                     |
| `email`            | string | Yes      | Valid email address                              |
| `password`         | string | Yes      | Minimum 8 characters, must include uppercase, lowercase, and number |
| `monthlyAllowance` | number | Yes      | Monthly allowance amount (positive number)       |
| `allowanceCycle`   | string | No       | One of: `WEEKLY`, `BIWEEKLY`, `MONTHLY`. Default: `MONTHLY` |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "clx1abc23...",
      "name": "Jane Doe",
      "email": "jane@university.edu",
      "monthlyAllowance": 5000.00,
      "allowanceCycle": "MONTHLY",
      "createdAt": "2026-02-25T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@university.edu",
    "password": "SecurePass123!",
    "monthlyAllowance": 5000.00
  }'
```

---

#### POST /api/auth/login

Authenticate an existing user.

| Property | Value |
| -------- | ----- |
| **Auth Required** | No |

**Request Body:**

```json
{
  "email": "jane@university.edu",
  "password": "SecurePass123!"
}
```

| Field      | Type   | Required | Description        |
| ---------- | ------ | -------- | ------------------ |
| `email`    | string | Yes      | Registered email   |
| `password` | string | Yes      | Account password   |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "clx1abc23...",
      "name": "Jane Doe",
      "email": "jane@university.edu",
      "monthlyAllowance": 5000.00,
      "allowanceCycle": "MONTHLY"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@university.edu",
    "password": "SecurePass123!"
  }'
```

---

#### POST /api/auth/refresh

Obtain a new access token using a valid refresh token.

| Property | Value |
| -------- | ----- |
| **Auth Required** | No |

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

| Field          | Type   | Required | Description                 |
| -------------- | ------ | -------- | --------------------------- |
| `refreshToken` | string | Yes      | Valid, unexpired refresh token |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

---

#### POST /api/auth/logout

Invalidate the current refresh token.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

| Field          | Type   | Required | Description                          |
| -------------- | ------ | -------- | ------------------------------------ |
| `refreshToken` | string | Yes      | The refresh token to invalidate      |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

---

### Users

Manage user profile and account settings.

---

#### GET /api/users/profile

Retrieve the authenticated user's profile.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "clx1abc23...",
    "name": "Jane Doe",
    "email": "jane@university.edu",
    "monthlyAllowance": 5000.00,
    "allowanceCycle": "MONTHLY",
    "createdAt": "2026-02-25T10:00:00.000Z",
    "updatedAt": "2026-02-25T10:00:00.000Z"
  }
}
```

**Example:**

```bash
curl http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <access_token>"
```

---

#### PATCH /api/users/profile

Update the authenticated user's profile.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Request Body:**

```json
{
  "name": "Jane Smith",
  "monthlyAllowance": 6000.00,
  "allowanceCycle": "BIWEEKLY"
}
```

| Field              | Type   | Required | Description                         |
| ------------------ | ------ | -------- | ----------------------------------- |
| `name`             | string | No       | Updated full name                   |
| `monthlyAllowance` | number | No       | Updated allowance amount            |
| `allowanceCycle`   | string | No       | `WEEKLY`, `BIWEEKLY`, or `MONTHLY`  |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "clx1abc23...",
    "name": "Jane Smith",
    "email": "jane@university.edu",
    "monthlyAllowance": 6000.00,
    "allowanceCycle": "BIWEEKLY",
    "updatedAt": "2026-02-25T12:00:00.000Z"
  }
}
```

**Example:**

```bash
curl -X PATCH http://localhost:3000/api/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "name": "Jane Smith",
    "monthlyAllowance": 6000.00
  }'
```

---

#### PATCH /api/users/change-password

Change the authenticated user's password.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Request Body:**

```json
{
  "currentPassword": "SecurePass123!",
  "newPassword": "EvenMoreSecure456!"
}
```

| Field             | Type   | Required | Description                         |
| ----------------- | ------ | -------- | ----------------------------------- |
| `currentPassword` | string | Yes      | Current account password            |
| `newPassword`     | string | Yes      | New password (same validation rules)|

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

**Example:**

```bash
curl -X PATCH http://localhost:3000/api/users/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "currentPassword": "SecurePass123!",
    "newPassword": "EvenMoreSecure456!"
  }'
```

---

#### DELETE /api/users/account

Permanently delete the authenticated user's account and all associated data.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Request Body:**

```json
{
  "password": "SecurePass123!"
}
```

| Field      | Type   | Required | Description                              |
| ---------- | ------ | -------- | ---------------------------------------- |
| `password` | string | Yes      | Current password for confirmation        |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Account deleted successfully",
  "data": null
}
```

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/users/account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "password": "SecurePass123!"
  }'
```

---

### Income

Track income sources and allowances.

---

#### POST /api/income

Record a new income entry.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Request Body:**

```json
{
  "source": "Monthly Allowance",
  "amount": 5000.00,
  "date": "2026-02-01T00:00:00.000Z",
  "description": "February allowance from parents"
}
```

| Field         | Type   | Required | Description                        |
| ------------- | ------ | -------- | ---------------------------------- |
| `source`      | string | Yes      | Income source name                 |
| `amount`      | number | Yes      | Amount (positive number)           |
| `date`        | string | No       | ISO 8601 date. Default: now        |
| `description` | string | No       | Additional notes                   |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Income recorded successfully",
  "data": {
    "id": "clx1def45...",
    "source": "Monthly Allowance",
    "amount": 5000.00,
    "date": "2026-02-01T00:00:00.000Z",
    "description": "February allowance from parents",
    "userId": "clx1abc23...",
    "createdAt": "2026-02-25T10:00:00.000Z"
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/income \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "source": "Monthly Allowance",
    "amount": 5000.00,
    "description": "February allowance from parents"
  }'
```

---

#### GET /api/income

List all income records for the authenticated user with pagination and filtering.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param     | Type   | Required | Description                                 |
| --------- | ------ | -------- | ------------------------------------------- |
| `page`    | number | No       | Page number (default: 1)                    |
| `limit`   | number | No       | Items per page (default: 10, max: 100)      |
| `startDate` | string | No     | Filter from this date (ISO 8601)            |
| `endDate` | string | No       | Filter up to this date (ISO 8601)           |
| `source`  | string | No       | Filter by source (partial match)            |
| `sortBy`  | string | No       | Sort field: `date`, `amount`. Default: `date` |
| `order`   | string | No       | Sort order: `asc`, `desc`. Default: `desc`  |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Income records retrieved successfully",
  "data": {
    "income": [
      {
        "id": "clx1def45...",
        "source": "Monthly Allowance",
        "amount": 5000.00,
        "date": "2026-02-01T00:00:00.000Z",
        "description": "February allowance from parents",
        "createdAt": "2026-02-25T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/income?page=1&limit=10&sortBy=date&order=desc" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/income/total

Get the total income for a given date range.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param       | Type   | Required | Description                       |
| ----------- | ------ | -------- | --------------------------------- |
| `startDate` | string | No       | Start of range (ISO 8601)         |
| `endDate`   | string | No       | End of range (ISO 8601)           |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Total income calculated successfully",
  "data": {
    "total": 7500.00,
    "startDate": "2026-02-01T00:00:00.000Z",
    "endDate": "2026-02-28T23:59:59.999Z",
    "count": 3
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/income/total?startDate=2026-02-01&endDate=2026-02-28" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/income/:id

Retrieve a single income record by ID.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Path Parameters:**

| Param | Type   | Description       |
| ----- | ------ | ----------------- |
| `id`  | string | Income record ID  |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Income record retrieved successfully",
  "data": {
    "id": "clx1def45...",
    "source": "Monthly Allowance",
    "amount": 5000.00,
    "date": "2026-02-01T00:00:00.000Z",
    "description": "February allowance from parents",
    "userId": "clx1abc23...",
    "createdAt": "2026-02-25T10:00:00.000Z",
    "updatedAt": "2026-02-25T10:00:00.000Z"
  }
}
```

**Example:**

```bash
curl http://localhost:3000/api/income/clx1def45 \
  -H "Authorization: Bearer <access_token>"
```

---

#### PATCH /api/income/:id

Update an existing income record.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Path Parameters:**

| Param | Type   | Description       |
| ----- | ------ | ----------------- |
| `id`  | string | Income record ID  |

**Request Body:**

```json
{
  "source": "Part-time Job",
  "amount": 2500.00
}
```

All fields are optional. Only provided fields are updated.

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Income record updated successfully",
  "data": {
    "id": "clx1def45...",
    "source": "Part-time Job",
    "amount": 2500.00,
    "date": "2026-02-01T00:00:00.000Z",
    "description": "February allowance from parents",
    "updatedAt": "2026-02-25T14:00:00.000Z"
  }
}
```

**Example:**

```bash
curl -X PATCH http://localhost:3000/api/income/clx1def45 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "source": "Part-time Job",
    "amount": 2500.00
  }'
```

---

#### DELETE /api/income/:id

Delete an income record.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Path Parameters:**

| Param | Type   | Description       |
| ----- | ------ | ----------------- |
| `id`  | string | Income record ID  |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Income record deleted successfully",
  "data": null
}
```

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/income/clx1def45 \
  -H "Authorization: Bearer <access_token>"
```

---

### Expenses

Track and categorize spending.

---

#### POST /api/expenses

Record a new expense.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Request Body:**

```json
{
  "description": "Lunch at campus cafeteria",
  "amount": 150.00,
  "category": "FOOD",
  "date": "2026-02-25T12:30:00.000Z"
}
```

| Field         | Type   | Required | Description                              |
| ------------- | ------ | -------- | ---------------------------------------- |
| `description` | string | Yes      | What the expense was for                 |
| `amount`      | number | Yes      | Expense amount (positive number)         |
| `category`    | string | Yes      | Expense category (see enum below)        |
| `date`        | string | No       | ISO 8601 date. Default: now              |

**Expense Categories:** `FOOD`, `TRANSPORT`, `ENTERTAINMENT`, `SHOPPING`, `UTILITIES`, `HEALTH`, `EDUCATION`, `OTHER`

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Expense recorded successfully",
  "data": {
    "id": "clx1ghi67...",
    "description": "Lunch at campus cafeteria",
    "amount": 150.00,
    "category": "FOOD",
    "date": "2026-02-25T12:30:00.000Z",
    "userId": "clx1abc23...",
    "createdAt": "2026-02-25T12:30:00.000Z"
  }
}
```

Note: Creating an expense automatically triggers overspending and impulse detection checks. If thresholds are exceeded, alerts are created in the background.

**Example:**

```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "description": "Lunch at campus cafeteria",
    "amount": 150.00,
    "category": "FOOD"
  }'
```

---

#### GET /api/expenses

List all expenses for the authenticated user with pagination and filtering.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param       | Type   | Required | Description                                  |
| ----------- | ------ | -------- | -------------------------------------------- |
| `page`      | number | No       | Page number (default: 1)                     |
| `limit`     | number | No       | Items per page (default: 10, max: 100)       |
| `category`  | string | No       | Filter by category                           |
| `startDate` | string | No       | Filter from this date (ISO 8601)             |
| `endDate`   | string | No       | Filter up to this date (ISO 8601)            |
| `minAmount` | number | No       | Minimum amount filter                        |
| `maxAmount` | number | No       | Maximum amount filter                        |
| `sortBy`    | string | No       | Sort field: `date`, `amount`. Default: `date`|
| `order`     | string | No       | Sort order: `asc`, `desc`. Default: `desc`   |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Expenses retrieved successfully",
  "data": {
    "expenses": [
      {
        "id": "clx1ghi67...",
        "description": "Lunch at campus cafeteria",
        "amount": 150.00,
        "category": "FOOD",
        "date": "2026-02-25T12:30:00.000Z",
        "createdAt": "2026-02-25T12:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/expenses?category=FOOD&page=1&limit=10" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/expenses/by-category

Get expense totals grouped by category.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param       | Type   | Required | Description                 |
| ----------- | ------ | -------- | --------------------------- |
| `startDate` | string | No       | Start of range (ISO 8601)   |
| `endDate`   | string | No       | End of range (ISO 8601)     |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Expenses by category retrieved successfully",
  "data": {
    "categories": [
      { "category": "FOOD", "total": 3200.00, "count": 25, "percentage": 42.1 },
      { "category": "TRANSPORT", "total": 1500.00, "count": 15, "percentage": 19.7 },
      { "category": "ENTERTAINMENT", "total": 800.00, "count": 5, "percentage": 10.5 }
    ],
    "grandTotal": 7600.00
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/expenses/by-category?startDate=2026-02-01&endDate=2026-02-28" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/expenses/total

Get total expenses for a date range.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param       | Type   | Required | Description                 |
| ----------- | ------ | -------- | --------------------------- |
| `startDate` | string | No       | Start of range (ISO 8601)   |
| `endDate`   | string | No       | End of range (ISO 8601)     |
| `category`  | string | No       | Filter by category          |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Total expenses calculated successfully",
  "data": {
    "total": 7600.00,
    "startDate": "2026-02-01T00:00:00.000Z",
    "endDate": "2026-02-28T23:59:59.999Z",
    "count": 45
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/expenses/total?startDate=2026-02-01&endDate=2026-02-28" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/expenses/:id

Retrieve a single expense by ID.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Path Parameters:**

| Param | Type   | Description       |
| ----- | ------ | ----------------- |
| `id`  | string | Expense record ID |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Expense retrieved successfully",
  "data": {
    "id": "clx1ghi67...",
    "description": "Lunch at campus cafeteria",
    "amount": 150.00,
    "category": "FOOD",
    "date": "2026-02-25T12:30:00.000Z",
    "userId": "clx1abc23...",
    "createdAt": "2026-02-25T12:30:00.000Z",
    "updatedAt": "2026-02-25T12:30:00.000Z"
  }
}
```

**Example:**

```bash
curl http://localhost:3000/api/expenses/clx1ghi67 \
  -H "Authorization: Bearer <access_token>"
```

---

#### PATCH /api/expenses/:id

Update an existing expense.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Path Parameters:**

| Param | Type   | Description       |
| ----- | ------ | ----------------- |
| `id`  | string | Expense record ID |

**Request Body:**

```json
{
  "description": "Dinner at campus cafeteria",
  "amount": 200.00,
  "category": "FOOD"
}
```

All fields are optional. Only provided fields are updated.

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Expense updated successfully",
  "data": {
    "id": "clx1ghi67...",
    "description": "Dinner at campus cafeteria",
    "amount": 200.00,
    "category": "FOOD",
    "date": "2026-02-25T12:30:00.000Z",
    "updatedAt": "2026-02-25T15:00:00.000Z"
  }
}
```

**Example:**

```bash
curl -X PATCH http://localhost:3000/api/expenses/clx1ghi67 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "description": "Dinner at campus cafeteria",
    "amount": 200.00
  }'
```

---

#### DELETE /api/expenses/:id

Delete an expense record.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Path Parameters:**

| Param | Type   | Description       |
| ----- | ------ | ----------------- |
| `id`  | string | Expense record ID |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Expense deleted successfully",
  "data": null
}
```

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/expenses/clx1ghi67 \
  -H "Authorization: Bearer <access_token>"
```

---

### Budgets

Create and manage category-specific budgets with automatic status tracking.

---

#### POST /api/budgets

Create a new budget for a specific category.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Request Body:**

```json
{
  "category": "FOOD",
  "amount": 3000.00,
  "period": "MONTHLY",
  "startDate": "2026-02-01T00:00:00.000Z",
  "endDate": "2026-02-28T23:59:59.999Z"
}
```

| Field       | Type   | Required | Description                                |
| ----------- | ------ | -------- | ------------------------------------------ |
| `category`  | string | Yes      | Expense category to budget for             |
| `amount`    | number | Yes      | Budget limit (positive number)             |
| `period`    | string | Yes      | `WEEKLY`, `BIWEEKLY`, or `MONTHLY`         |
| `startDate` | string | No       | Budget start date (ISO 8601)               |
| `endDate`   | string | No       | Budget end date (ISO 8601)                 |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Budget created successfully",
  "data": {
    "id": "clx1jkl89...",
    "category": "FOOD",
    "amount": 3000.00,
    "period": "MONTHLY",
    "startDate": "2026-02-01T00:00:00.000Z",
    "endDate": "2026-02-28T23:59:59.999Z",
    "userId": "clx1abc23...",
    "createdAt": "2026-02-25T10:00:00.000Z"
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/budgets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "category": "FOOD",
    "amount": 3000.00,
    "period": "MONTHLY"
  }'
```

---

#### GET /api/budgets

List all budgets for the authenticated user.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param      | Type   | Required | Description                           |
| ---------- | ------ | -------- | ------------------------------------- |
| `page`     | number | No       | Page number (default: 1)              |
| `limit`    | number | No       | Items per page (default: 10)          |
| `category` | string | No       | Filter by category                    |
| `period`   | string | No       | Filter by period                      |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Budgets retrieved successfully",
  "data": {
    "budgets": [
      {
        "id": "clx1jkl89...",
        "category": "FOOD",
        "amount": 3000.00,
        "period": "MONTHLY",
        "startDate": "2026-02-01T00:00:00.000Z",
        "endDate": "2026-02-28T23:59:59.999Z",
        "createdAt": "2026-02-25T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/budgets?category=FOOD" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/budgets/status

Get the status of all active budgets with spending progress.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Budget statuses retrieved successfully",
  "data": {
    "budgets": [
      {
        "id": "clx1jkl89...",
        "category": "FOOD",
        "budgetAmount": 3000.00,
        "spent": 2100.00,
        "remaining": 900.00,
        "percentUsed": 70.0,
        "status": "ON_TRACK",
        "period": "MONTHLY"
      },
      {
        "id": "clx1mno01...",
        "category": "ENTERTAINMENT",
        "budgetAmount": 1000.00,
        "spent": 1150.00,
        "remaining": -150.00,
        "percentUsed": 115.0,
        "status": "EXCEEDED",
        "period": "MONTHLY"
      }
    ]
  }
}
```

Status values: `ON_TRACK` (< 80%), `WARNING` (80-100%), `EXCEEDED` (> 100%).

**Example:**

```bash
curl http://localhost:3000/api/budgets/status \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/budgets/:id

Retrieve a single budget by ID.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Path Parameters:**

| Param | Type   | Description    |
| ----- | ------ | -------------- |
| `id`  | string | Budget ID      |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Budget retrieved successfully",
  "data": {
    "id": "clx1jkl89...",
    "category": "FOOD",
    "amount": 3000.00,
    "period": "MONTHLY",
    "startDate": "2026-02-01T00:00:00.000Z",
    "endDate": "2026-02-28T23:59:59.999Z",
    "userId": "clx1abc23...",
    "createdAt": "2026-02-25T10:00:00.000Z",
    "updatedAt": "2026-02-25T10:00:00.000Z"
  }
}
```

**Example:**

```bash
curl http://localhost:3000/api/budgets/clx1jkl89 \
  -H "Authorization: Bearer <access_token>"
```

---

#### PATCH /api/budgets/:id

Update an existing budget.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Path Parameters:**

| Param | Type   | Description    |
| ----- | ------ | -------------- |
| `id`  | string | Budget ID      |

**Request Body:**

```json
{
  "amount": 3500.00
}
```

All fields are optional.

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Budget updated successfully",
  "data": {
    "id": "clx1jkl89...",
    "category": "FOOD",
    "amount": 3500.00,
    "period": "MONTHLY",
    "updatedAt": "2026-02-25T16:00:00.000Z"
  }
}
```

**Example:**

```bash
curl -X PATCH http://localhost:3000/api/budgets/clx1jkl89 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{ "amount": 3500.00 }'
```

---

#### DELETE /api/budgets/:id

Delete a budget.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Path Parameters:**

| Param | Type   | Description    |
| ----- | ------ | -------------- |
| `id`  | string | Budget ID      |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Budget deleted successfully",
  "data": null
}
```

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/budgets/clx1jkl89 \
  -H "Authorization: Bearer <access_token>"
```

---

### Analytics

Behavioral spending analytics and insights.

---

#### GET /api/analytics/heatmap

Get a spending heatmap showing expense distribution by day of week and hour.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param       | Type   | Required | Description                 |
| ----------- | ------ | -------- | --------------------------- |
| `startDate` | string | No       | Start of range (ISO 8601)   |
| `endDate`   | string | No       | End of range (ISO 8601)     |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Spending heatmap generated successfully",
  "data": {
    "heatmap": [
      { "day": "Monday", "hour": 12, "total": 450.00, "count": 5 },
      { "day": "Monday", "hour": 18, "total": 200.00, "count": 2 },
      { "day": "Friday", "hour": 20, "total": 800.00, "count": 3 }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/analytics/heatmap?startDate=2026-02-01&endDate=2026-02-28" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/analytics/category-dominance

Identify which spending categories dominate over time.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param       | Type   | Required | Description                 |
| ----------- | ------ | -------- | --------------------------- |
| `startDate` | string | No       | Start of range (ISO 8601)   |
| `endDate`   | string | No       | End of range (ISO 8601)     |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Category dominance data retrieved successfully",
  "data": {
    "dominance": [
      { "category": "FOOD", "total": 3200.00, "percentage": 42.1, "rank": 1 },
      { "category": "TRANSPORT", "total": 1500.00, "percentage": 19.7, "rank": 2 },
      { "category": "ENTERTAINMENT", "total": 800.00, "percentage": 10.5, "rank": 3 }
    ],
    "totalSpending": 7600.00
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/analytics/category-dominance" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/analytics/spending-trend

Get daily spending trend data over a time range.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param       | Type   | Required | Description                 |
| ----------- | ------ | -------- | --------------------------- |
| `startDate` | string | No       | Start of range (ISO 8601)   |
| `endDate`   | string | No       | End of range (ISO 8601)     |
| `category`  | string | No       | Filter by category          |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Spending trend data retrieved successfully",
  "data": {
    "trend": [
      { "date": "2026-02-20", "total": 350.00, "count": 4 },
      { "date": "2026-02-21", "total": 200.00, "count": 2 },
      { "date": "2026-02-22", "total": 500.00, "count": 6 }
    ],
    "average": 350.00
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/analytics/spending-trend?startDate=2026-02-01&endDate=2026-02-28" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/analytics/summary

Get a high-level financial summary for the user.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param       | Type   | Required | Description                 |
| ----------- | ------ | -------- | --------------------------- |
| `startDate` | string | No       | Start of range (ISO 8601)   |
| `endDate`   | string | No       | End of range (ISO 8601)     |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Analytics summary retrieved successfully",
  "data": {
    "totalIncome": 5000.00,
    "totalExpenses": 3800.00,
    "netSavings": 1200.00,
    "savingsRate": 24.0,
    "topCategory": "FOOD",
    "totalTransactions": 42,
    "averageDailySpend": 135.71,
    "activeBudgets": 3,
    "budgetsExceeded": 1
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/analytics/summary" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/analytics/weekly-comparison

Compare spending between the current week and the previous week.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Weekly comparison data retrieved successfully",
  "data": {
    "currentWeek": {
      "total": 2100.00,
      "count": 18,
      "startDate": "2026-02-23",
      "endDate": "2026-02-25"
    },
    "previousWeek": {
      "total": 1800.00,
      "count": 15,
      "startDate": "2026-02-16",
      "endDate": "2026-02-22"
    },
    "change": {
      "amount": 300.00,
      "percentage": 16.7,
      "direction": "INCREASE"
    }
  }
}
```

**Example:**

```bash
curl http://localhost:3000/api/analytics/weekly-comparison \
  -H "Authorization: Bearer <access_token>"
```

---

### Alerts

Overspending and impulse alerts generated automatically by the system.

---

#### GET /api/alerts

List all alerts for the authenticated user.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param    | Type    | Required | Description                               |
| -------- | ------- | -------- | ----------------------------------------- |
| `page`   | number  | No       | Page number (default: 1)                  |
| `limit`  | number  | No       | Items per page (default: 10)              |
| `type`   | string  | No       | Filter by type: `OVERSPEND`, `IMPULSE`    |
| `isRead` | boolean | No       | Filter by read status                     |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Alerts retrieved successfully",
  "data": {
    "alerts": [
      {
        "id": "clx1pqr23...",
        "type": "OVERSPEND",
        "title": "Budget Exceeded: FOOD",
        "message": "You have exceeded your FOOD budget by 15%. Budget: 3000.00, Spent: 3450.00",
        "isRead": false,
        "category": "FOOD",
        "createdAt": "2026-02-25T14:00:00.000Z"
      },
      {
        "id": "clx1stu45...",
        "type": "IMPULSE",
        "title": "Impulse Spending Detected",
        "message": "You made 4 purchases within 60 minutes totaling 650.00",
        "isRead": false,
        "category": null,
        "createdAt": "2026-02-24T19:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/alerts?type=OVERSPEND&isRead=false" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/alerts/unread-count

Get the count of unread alerts.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Unread alert count retrieved successfully",
  "data": {
    "count": 3
  }
}
```

**Example:**

```bash
curl http://localhost:3000/api/alerts/unread-count \
  -H "Authorization: Bearer <access_token>"
```

---

#### PATCH /api/alerts/:id/read

Mark a specific alert as read.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Path Parameters:**

| Param | Type   | Description |
| ----- | ------ | ----------- |
| `id`  | string | Alert ID    |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Alert marked as read",
  "data": {
    "id": "clx1pqr23...",
    "isRead": true
  }
}
```

**Example:**

```bash
curl -X PATCH http://localhost:3000/api/alerts/clx1pqr23/read \
  -H "Authorization: Bearer <access_token>"
```

---

#### PATCH /api/alerts/read-all

Mark all alerts as read.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "All alerts marked as read",
  "data": {
    "updatedCount": 5
  }
}
```

**Example:**

```bash
curl -X PATCH http://localhost:3000/api/alerts/read-all \
  -H "Authorization: Bearer <access_token>"
```

---

### Recommendations

AI-powered smart saving recommendations generated on demand.

---

#### POST /api/recommendations/generate

Generate new saving recommendations based on current spending patterns.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Recommendations generated successfully",
  "data": {
    "recommendations": [
      {
        "id": "clx1vwx67...",
        "title": "Reduce Food Spending",
        "description": "Your food spending is 42% of total expenses. Consider meal prepping to reduce costs by an estimated 500.00 per month.",
        "potentialSavings": 500.00,
        "category": "FOOD",
        "priority": "HIGH",
        "createdAt": "2026-02-25T10:00:00.000Z"
      },
      {
        "id": "clx1yza89...",
        "title": "Optimize Transport Costs",
        "description": "You spend an average of 75.00 per week on transport. Using a student bus pass could save you up to 200.00 monthly.",
        "potentialSavings": 200.00,
        "category": "TRANSPORT",
        "priority": "MEDIUM",
        "createdAt": "2026-02-25T10:00:00.000Z"
      }
    ],
    "totalPotentialSavings": 700.00
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/recommendations/generate \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/recommendations

List all recommendations for the authenticated user.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param    | Type   | Required | Description                        |
| -------- | ------ | -------- | ---------------------------------- |
| `page`   | number | No       | Page number (default: 1)           |
| `limit`  | number | No       | Items per page (default: 10)       |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Recommendations retrieved successfully",
  "data": {
    "recommendations": [
      {
        "id": "clx1vwx67...",
        "title": "Reduce Food Spending",
        "description": "Your food spending is 42% of total expenses...",
        "potentialSavings": 500.00,
        "category": "FOOD",
        "priority": "HIGH",
        "createdAt": "2026-02-25T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/recommendations" \
  -H "Authorization: Bearer <access_token>"
```

---

#### DELETE /api/recommendations/:id

Dismiss a recommendation.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Path Parameters:**

| Param | Type   | Description        |
| ----- | ------ | ------------------ |
| `id`  | string | Recommendation ID  |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Recommendation deleted successfully",
  "data": null
}
```

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/recommendations/clx1vwx67 \
  -H "Authorization: Bearer <access_token>"
```

---

### Forecast

Financial health assessment and survival forecasting based on current spending velocity.

---

#### POST /api/forecast/generate

Generate a new financial health forecast snapshot.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Forecast generated successfully",
  "data": {
    "id": "clx1bcd01...",
    "totalBalance": 2200.00,
    "dailyBurnRate": 135.71,
    "survivalDays": 16,
    "riskLevel": "WARNING",
    "forecastDate": "2026-02-25T10:00:00.000Z",
    "recommendations": "Consider reducing discretionary spending to extend your financial runway.",
    "createdAt": "2026-02-25T10:00:00.000Z"
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/forecast/generate \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/forecast/latest

Get the most recent forecast snapshot.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Latest forecast retrieved successfully",
  "data": {
    "id": "clx1bcd01...",
    "totalBalance": 2200.00,
    "dailyBurnRate": 135.71,
    "survivalDays": 16,
    "riskLevel": "WARNING",
    "forecastDate": "2026-02-25T10:00:00.000Z",
    "recommendations": "Consider reducing discretionary spending to extend your financial runway.",
    "createdAt": "2026-02-25T10:00:00.000Z"
  }
}
```

**Example:**

```bash
curl http://localhost:3000/api/forecast/latest \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/forecast/history

Get historical forecast snapshots to observe financial health trends.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param   | Type   | Required | Description                  |
| ------- | ------ | -------- | ---------------------------- |
| `page`  | number | No       | Page number (default: 1)     |
| `limit` | number | No       | Items per page (default: 10) |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Forecast history retrieved successfully",
  "data": {
    "forecasts": [
      {
        "id": "clx1bcd01...",
        "totalBalance": 2200.00,
        "dailyBurnRate": 135.71,
        "survivalDays": 16,
        "riskLevel": "WARNING",
        "forecastDate": "2026-02-25T10:00:00.000Z"
      },
      {
        "id": "clx1efg23...",
        "totalBalance": 3500.00,
        "dailyBurnRate": 120.00,
        "survivalDays": 29,
        "riskLevel": "WARNING",
        "forecastDate": "2026-02-18T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/forecast/history?page=1&limit=10" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/forecast/health

Get a real-time financial health indicator without creating a snapshot.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Financial health status retrieved successfully",
  "data": {
    "totalBalance": 2200.00,
    "dailyBurnRate": 135.71,
    "estimatedSurvivalDays": 16,
    "riskLevel": "WARNING",
    "monthlyAllowance": 5000.00,
    "daysUntilNextAllowance": 3,
    "projectedEndOfMonthBalance": -1874.97
  }
}
```

**Example:**

```bash
curl http://localhost:3000/api/forecast/health \
  -H "Authorization: Bearer <access_token>"
```

---

### Reports

Generate financial reports in various formats and time ranges.

---

#### GET /api/reports/monthly

Generate a comprehensive monthly financial report.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param   | Type   | Required | Description                          |
| ------- | ------ | -------- | ------------------------------------ |
| `month` | number | No       | Month number (1-12). Default: current month |
| `year`  | number | No       | Year. Default: current year          |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Monthly report generated successfully",
  "data": {
    "period": "February 2026",
    "income": {
      "total": 5000.00,
      "sources": [
        { "source": "Monthly Allowance", "amount": 5000.00 }
      ]
    },
    "expenses": {
      "total": 3800.00,
      "byCategory": [
        { "category": "FOOD", "amount": 1600.00, "percentage": 42.1 },
        { "category": "TRANSPORT", "amount": 750.00, "percentage": 19.7 }
      ],
      "count": 42
    },
    "budgets": {
      "active": 3,
      "exceeded": 1,
      "details": [
        { "category": "FOOD", "budget": 3000.00, "spent": 1600.00, "status": "ON_TRACK" }
      ]
    },
    "savings": {
      "amount": 1200.00,
      "rate": 24.0
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/reports/monthly?month=2&year=2026" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/reports/weekly

Generate a weekly financial report.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param       | Type   | Required | Description                             |
| ----------- | ------ | -------- | --------------------------------------- |
| `startDate` | string | No       | Week start date (ISO 8601). Default: current week |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Weekly report generated successfully",
  "data": {
    "period": {
      "startDate": "2026-02-23",
      "endDate": "2026-03-01"
    },
    "totalIncome": 0.00,
    "totalExpenses": 2100.00,
    "dailyBreakdown": [
      { "date": "2026-02-23", "expenses": 350.00, "count": 3 },
      { "date": "2026-02-24", "expenses": 500.00, "count": 5 },
      { "date": "2026-02-25", "expenses": 1250.00, "count": 10 }
    ],
    "topCategories": [
      { "category": "FOOD", "amount": 900.00 },
      { "category": "SHOPPING", "amount": 600.00 }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/reports/weekly?startDate=2026-02-23" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/reports/custom

Generate a report for a custom date range.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param       | Type   | Required | Description                   |
| ----------- | ------ | -------- | ----------------------------- |
| `startDate` | string | Yes      | Start of range (ISO 8601)     |
| `endDate`   | string | Yes      | End of range (ISO 8601)       |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Custom report generated successfully",
  "data": {
    "period": {
      "startDate": "2026-01-01",
      "endDate": "2026-02-25"
    },
    "totalIncome": 10000.00,
    "totalExpenses": 7600.00,
    "netSavings": 2400.00,
    "savingsRate": 24.0,
    "expensesByCategory": [
      { "category": "FOOD", "amount": 3200.00, "percentage": 42.1 }
    ],
    "transactionCount": 85
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/reports/custom?startDate=2026-01-01&endDate=2026-02-25" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/reports/export

Export report data in CSV or JSON format.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param       | Type   | Required | Description                        |
| ----------- | ------ | -------- | ---------------------------------- |
| `startDate` | string | Yes      | Start of range (ISO 8601)          |
| `endDate`   | string | Yes      | End of range (ISO 8601)            |
| `format`    | string | No       | Export format: `json`, `csv`. Default: `json` |
| `type`      | string | No       | Data to export: `expenses`, `income`, `all`. Default: `all` |

**Response (200 OK):** Returns the data in the requested format. For CSV, the `Content-Type` header is `text/csv`. For JSON, the standard response format is used.

**Example:**

```bash
# Export as CSV
curl "http://localhost:3000/api/reports/export?startDate=2026-02-01&endDate=2026-02-28&format=csv&type=expenses" \
  -H "Authorization: Bearer <access_token>" \
  -o expenses_feb2026.csv

# Export as JSON
curl "http://localhost:3000/api/reports/export?startDate=2026-02-01&endDate=2026-02-28&format=json" \
  -H "Authorization: Bearer <access_token>"
```

---

### Notifications

System notifications including weekly digests and important alerts.

---

#### GET /api/notifications

List all notifications for the authenticated user.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Query Parameters:**

| Param    | Type    | Required | Description                         |
| -------- | ------- | -------- | ----------------------------------- |
| `page`   | number  | No       | Page number (default: 1)            |
| `limit`  | number  | No       | Items per page (default: 10)        |
| `isRead` | boolean | No       | Filter by read status               |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "id": "clx1hij01...",
        "title": "Weekly Spending Digest",
        "message": "You spent 2100.00 this week across 18 transactions. Your top category was FOOD at 900.00.",
        "type": "WEEKLY_DIGEST",
        "isRead": false,
        "createdAt": "2026-02-24T08:00:00.000Z"
      },
      {
        "id": "clx1klm23...",
        "title": "Budget Alert: FOOD",
        "message": "You have used 80% of your FOOD budget for this month.",
        "type": "BUDGET_WARNING",
        "isRead": true,
        "createdAt": "2026-02-23T14:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/notifications?isRead=false" \
  -H "Authorization: Bearer <access_token>"
```

---

#### GET /api/notifications/unread-count

Get the count of unread notifications.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Unread notification count retrieved successfully",
  "data": {
    "count": 5
  }
}
```

**Example:**

```bash
curl http://localhost:3000/api/notifications/unread-count \
  -H "Authorization: Bearer <access_token>"
```

---

#### PATCH /api/notifications/:id/read

Mark a specific notification as read.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Path Parameters:**

| Param | Type   | Description      |
| ----- | ------ | ---------------- |
| `id`  | string | Notification ID  |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": "clx1hij01...",
    "isRead": true
  }
}
```

**Example:**

```bash
curl -X PATCH http://localhost:3000/api/notifications/clx1hij01/read \
  -H "Authorization: Bearer <access_token>"
```

---

#### PATCH /api/notifications/read-all

Mark all notifications as read.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "updatedCount": 5
  }
}
```

**Example:**

```bash
curl -X PATCH http://localhost:3000/api/notifications/read-all \
  -H "Authorization: Bearer <access_token>"
```

---

#### DELETE /api/notifications/:id

Delete a specific notification.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Path Parameters:**

| Param | Type   | Description      |
| ----- | ------ | ---------------- |
| `id`  | string | Notification ID  |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Notification deleted successfully",
  "data": null
}
```

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/notifications/clx1hij01 \
  -H "Authorization: Bearer <access_token>"
```

---

#### DELETE /api/notifications/read

Delete all read notifications.

| Property | Value |
| -------- | ----- |
| **Auth Required** | Yes |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Read notifications deleted successfully",
  "data": {
    "deletedCount": 12
  }
}
```

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/notifications/read \
  -H "Authorization: Bearer <access_token>"
```

---

## Error Codes

The API uses standard HTTP status codes along with descriptive error messages.

| Status Code | Name                    | Description                                                    |
| ----------- | ----------------------- | -------------------------------------------------------------- |
| 200         | OK                      | Request succeeded                                              |
| 201         | Created                 | Resource created successfully                                  |
| 400         | Bad Request             | Invalid request body, missing required fields, or validation failure |
| 401         | Unauthorized            | Missing, invalid, or expired authentication token              |
| 403         | Forbidden               | Authenticated but not authorized to access the resource        |
| 404         | Not Found               | Requested resource does not exist or does not belong to the user |
| 409         | Conflict                | Resource conflict (e.g., duplicate email during registration)  |
| 422         | Unprocessable Entity    | Request body is syntactically correct but semantically invalid |
| 429         | Too Many Requests       | Rate limit exceeded. Retry after the duration in `Retry-After` header |
| 500         | Internal Server Error   | Unexpected server error. Check server logs for details         |

### Error Response Examples

**Validation Error (400):**

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

**Authentication Error (401):**

```json
{
  "success": false,
  "message": "Access token is invalid or expired",
  "data": null
}
```

**Not Found Error (404):**

```json
{
  "success": false,
  "message": "Expense not found",
  "data": null
}
```

**Rate Limit Error (429):**

```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "data": null
}
```

**Server Error (500):**

```json
{
  "success": false,
  "message": "Internal server error",
  "data": null
}
```

---

## Interactive Documentation

Full Swagger/OpenAPI 3.0 documentation is available at:

```
http://localhost:3000/api-docs
```

This provides an interactive UI where you can test all endpoints directly in your browser.
