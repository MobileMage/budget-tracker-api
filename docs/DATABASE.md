# Database Schema Documentation

This document describes the complete database schema for the Student Budget and Expense Tracking System, powered by PostgreSQL and managed through Prisma ORM.

---

## Table of Contents

- [Overview](#overview)
- [Models](#models)
  - [User](#user)
  - [RefreshToken](#refreshtoken)
  - [Income](#income)
  - [Expense](#expense)
  - [Budget](#budget)
  - [Alert](#alert)
  - [Recommendation](#recommendation)
  - [ForecastSnapshot](#forecastsnapshot)
  - [Notification](#notification)
- [Enums](#enums)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Indexing Strategy](#indexing-strategy)

---

## Overview

The database is designed around a single-tenant, user-centric model where every financial record belongs to exactly one user. All models (except `User` and `RefreshToken`) represent financial data or system-generated insights tied to a user through a foreign key relationship.

Key design decisions:
- **Soft references over hard cascades**: Deletion of parent records cascades to dependent records to maintain referential integrity.
- **Temporal data**: Most models include `createdAt` and `updatedAt` timestamps for audit trails.
- **Enums over lookup tables**: Categorical data uses PostgreSQL enums for type safety and performance.
- **CUID primary keys**: All models use Prisma-generated CUIDs as primary keys for globally unique, URL-safe identifiers.

---

## Models

### User

The central entity representing a registered student user.

| Field              | Type            | Attributes                    | Description                                      |
| ------------------ | --------------- | ----------------------------- | ------------------------------------------------ |
| `id`               | String          | @id @default(cuid())          | Unique identifier                                |
| `name`             | String          |                               | Full name of the user                            |
| `email`            | String          | @unique                       | Email address (used for login)                   |
| `password`         | String          |                               | Bcrypt-hashed password                           |
| `monthlyAllowance` | Float           |                               | Monthly budget allowance amount                  |
| `allowanceCycle`   | AllowanceCycle  | @default(MONTHLY)             | How frequently allowance is received             |
| `createdAt`        | DateTime        | @default(now())               | Account creation timestamp                       |
| `updatedAt`        | DateTime        | @updatedAt                    | Last profile update timestamp                    |

**Relations:**
- Has many `RefreshToken` (cascade delete)
- Has many `Income` (cascade delete)
- Has many `Expense` (cascade delete)
- Has many `Budget` (cascade delete)
- Has many `Alert` (cascade delete)
- Has many `Recommendation` (cascade delete)
- Has many `ForecastSnapshot` (cascade delete)
- Has many `Notification` (cascade delete)

---

### RefreshToken

Stores active refresh tokens for JWT authentication. Supports token rotation and revocation.

| Field       | Type     | Attributes            | Description                                |
| ----------- | -------- | --------------------- | ------------------------------------------ |
| `id`        | String   | @id @default(cuid())  | Unique identifier                          |
| `token`     | String   | @unique               | The hashed refresh token value             |
| `userId`    | String   |                       | Foreign key to User                        |
| `expiresAt` | DateTime |                       | Token expiration timestamp                 |
| `createdAt` | DateTime | @default(now())       | Token creation timestamp                   |

**Relations:**
- Belongs to one `User`

---

### Income

Records of money received by the user from various sources.

| Field         | Type     | Attributes            | Description                              |
| ------------- | -------- | --------------------- | ---------------------------------------- |
| `id`          | String   | @id @default(cuid())  | Unique identifier                        |
| `source`      | String   |                       | Name of the income source                |
| `amount`      | Float    |                       | Income amount (always positive)          |
| `date`        | DateTime | @default(now())       | Date the income was received             |
| `description` | String?  |                       | Optional notes about this income         |
| `userId`      | String   |                       | Foreign key to User                      |
| `createdAt`   | DateTime | @default(now())       | Record creation timestamp                |
| `updatedAt`   | DateTime | @updatedAt            | Last update timestamp                    |

**Relations:**
- Belongs to one `User`

---

### Expense

Individual spending transactions tracked by category.

| Field         | Type            | Attributes            | Description                              |
| ------------- | --------------- | --------------------- | ---------------------------------------- |
| `id`          | String          | @id @default(cuid())  | Unique identifier                        |
| `description` | String          |                       | What the money was spent on              |
| `amount`      | Float           |                       | Expense amount (always positive)         |
| `category`    | ExpenseCategory |                       | Spending category classification         |
| `date`        | DateTime        | @default(now())       | Date of the expense                      |
| `userId`      | String          |                       | Foreign key to User                      |
| `createdAt`   | DateTime        | @default(now())       | Record creation timestamp                |
| `updatedAt`   | DateTime        | @updatedAt            | Last update timestamp                    |

**Relations:**
- Belongs to one `User`

**Side Effects:**
- Creating an expense triggers automatic overspending detection (checks budget limits).
- Creating an expense triggers impulse spending detection (checks time-window patterns).

---

### Budget

Category-specific spending limits for defined time periods.

| Field       | Type            | Attributes            | Description                                |
| ----------- | --------------- | --------------------- | ------------------------------------------ |
| `id`        | String          | @id @default(cuid())  | Unique identifier                          |
| `category`  | ExpenseCategory |                       | The expense category this budget covers    |
| `amount`    | Float           |                       | Maximum spending limit                     |
| `period`    | BudgetPeriod    |                       | Time period for the budget                 |
| `startDate` | DateTime        |                       | Budget period start                        |
| `endDate`   | DateTime        |                       | Budget period end                          |
| `userId`    | String          |                       | Foreign key to User                        |
| `createdAt` | DateTime        | @default(now())       | Record creation timestamp                  |
| `updatedAt` | DateTime        | @updatedAt            | Last update timestamp                      |

**Relations:**
- Belongs to one `User`

---

### Alert

System-generated alerts for overspending and impulse behavior patterns.

| Field       | Type            | Attributes            | Description                                |
| ----------- | --------------- | --------------------- | ------------------------------------------ |
| `id`        | String          | @id @default(cuid())  | Unique identifier                          |
| `type`      | AlertType       |                       | Type of alert (OVERSPEND or IMPULSE)       |
| `title`     | String          |                       | Short alert headline                       |
| `message`   | String          |                       | Detailed alert description                 |
| `isRead`    | Boolean         | @default(false)       | Whether the user has acknowledged the alert|
| `category`  | ExpenseCategory?|                       | Related expense category (if applicable)   |
| `userId`    | String          |                       | Foreign key to User                        |
| `createdAt` | DateTime        | @default(now())       | Alert generation timestamp                 |

**Relations:**
- Belongs to one `User`

---

### Recommendation

Smart saving suggestions generated by the rule engine based on spending patterns.

| Field              | Type            | Attributes            | Description                                |
| ------------------ | --------------- | --------------------- | ------------------------------------------ |
| `id`               | String          | @id @default(cuid())  | Unique identifier                          |
| `title`            | String          |                       | Recommendation headline                    |
| `description`      | String          |                       | Detailed actionable advice                 |
| `potentialSavings` | Float           |                       | Estimated monthly savings if followed      |
| `category`         | ExpenseCategory?|                       | Related spending category                  |
| `priority`         | String          |                       | Priority level: HIGH, MEDIUM, LOW          |
| `userId`           | String          |                       | Foreign key to User                        |
| `createdAt`        | DateTime        | @default(now())       | Generation timestamp                       |

**Relations:**
- Belongs to one `User`

---

### ForecastSnapshot

Point-in-time snapshots of the user's financial health and burn rate projections.

| Field            | Type      | Attributes            | Description                                |
| ---------------- | --------- | --------------------- | ------------------------------------------ |
| `id`             | String    | @id @default(cuid())  | Unique identifier                          |
| `totalBalance`   | Float     |                       | Available balance at time of snapshot      |
| `dailyBurnRate`  | Float     |                       | Average daily spending (7-day rolling)     |
| `survivalDays`   | Int       |                       | Projected days until funds are exhausted   |
| `riskLevel`      | RiskLevel |                       | Financial risk classification              |
| `forecastDate`   | DateTime  |                       | Date of the forecast calculation           |
| `recommendations` | String?  |                       | Contextual advice based on risk level      |
| `userId`         | String    |                       | Foreign key to User                        |
| `createdAt`      | DateTime  | @default(now())       | Snapshot creation timestamp                |

**Relations:**
- Belongs to one `User`

---

### Notification

System notifications including weekly digests, budget warnings, and other messages.

| Field       | Type     | Attributes            | Description                                |
| ----------- | -------- | --------------------- | ------------------------------------------ |
| `id`        | String   | @id @default(cuid())  | Unique identifier                          |
| `title`     | String   |                       | Notification headline                      |
| `message`   | String   |                       | Notification body content                  |
| `type`      | String   |                       | Notification type (e.g., WEEKLY_DIGEST, BUDGET_WARNING) |
| `isRead`    | Boolean  | @default(false)       | Whether the user has read the notification |
| `userId`    | String   |                       | Foreign key to User                        |
| `createdAt` | DateTime | @default(now())       | Notification creation timestamp            |

**Relations:**
- Belongs to one `User`

---

## Enums

### AllowanceCycle

Defines how frequently a user receives their allowance.

| Value      | Description                         |
| ---------- | ----------------------------------- |
| `WEEKLY`   | Allowance received every week       |
| `BIWEEKLY` | Allowance received every two weeks  |
| `MONTHLY`  | Allowance received every month      |

### BudgetPeriod

Defines the time span a budget covers.

| Value      | Description                   |
| ---------- | ----------------------------- |
| `WEEKLY`   | Budget resets every week      |
| `BIWEEKLY` | Budget resets every two weeks |
| `MONTHLY`  | Budget resets every month     |

### AlertType

Classifies the type of behavioral alert.

| Value       | Description                                          |
| ----------- | ---------------------------------------------------- |
| `OVERSPEND` | User has exceeded a budget threshold                 |
| `IMPULSE`   | User exhibits impulse spending behavior patterns     |

### RiskLevel

Financial health risk classification for forecast snapshots.

| Value     | Description                                        |
| --------- | -------------------------------------------------- |
| `SAFE`    | More than 30 days of financial runway remaining    |
| `WARNING` | Between 15 and 30 days of runway remaining         |
| `DANGER`  | Fewer than 15 days of runway remaining             |

### ExpenseCategory

Categorization of spending transactions.

| Value           | Description                                    |
| --------------- | ---------------------------------------------- |
| `FOOD`          | Meals, groceries, snacks, beverages            |
| `TRANSPORT`     | Public transit, fuel, ride-sharing, parking    |
| `ENTERTAINMENT` | Movies, games, streaming, social outings       |
| `SHOPPING`      | Clothing, electronics, personal items          |
| `UTILITIES`     | Phone bills, internet, electricity, water      |
| `HEALTH`        | Medicine, gym, doctor visits, insurance        |
| `EDUCATION`     | Books, courses, supplies, printing             |
| `OTHER`         | Anything not covered by the above categories   |

---

## Entity Relationship Diagram

```
┌──────────────────────────────────┐
│              User                │
├──────────────────────────────────┤
│ id             String  (PK)     │
│ name           String           │
│ email          String  (UNIQUE) │
│ password       String           │
│ monthlyAllowance Float          │
│ allowanceCycle AllowanceCycle    │
│ createdAt      DateTime         │
│ updatedAt      DateTime         │
└──────────┬───────────────────────┘
           │
           │ 1:N
           │
     ┌─────┼─────────┬──────────┬──────────┬───────────┬──────────────┬─────────────────┬──────────────┐
     │     │         │          │          │           │              │                 │              │
     ▼     ▼         ▼          ▼          ▼           ▼              ▼                 ▼              ▼
┌─────────┐ ┌───────┐ ┌────────┐ ┌───────┐ ┌─────────┐ ┌──────────────┐ ┌────────────────┐ ┌────────────┐
│Refresh  │ │Income │ │Expense │ │Budget │ │ Alert   │ │Recommendation│ │ForecastSnapshot│ │Notification│
│Token    │ │       │ │        │ │       │ │         │ │              │ │                │ │            │
├─────────┤ ├───────┤ ├────────┤ ├───────┤ ├─────────┤ ├──────────────┤ ├────────────────┤ ├────────────┤
│id    (PK)│ │id (PK)│ │id  (PK)│ │id (PK)│ │id   (PK)│ │id       (PK)│ │id         (PK)│ │id     (PK)│
│token     │ │source │ │descrip.│ │categ. │ │type     │ │title         │ │totalBalance    │ │title      │
│userId(FK)│ │amount │ │amount  │ │amount │ │title    │ │description   │ │dailyBurnRate   │ │message    │
│expiresAt │ │date   │ │category│ │period │ │message  │ │potential-    │ │survivalDays    │ │type       │
│createdAt │ │descrip│ │date    │ │start  │ │isRead   │ │  Savings     │ │riskLevel       │ │isRead     │
│          │ │userId │ │userId  │ │end    │ │category │ │category      │ │forecastDate    │ │userId(FK) │
│          │ │(FK)   │ │(FK)    │ │userId │ │userId   │ │priority      │ │recommendations │ │createdAt  │
│          │ │created│ │created │ │(FK)   │ │(FK)     │ │userId   (FK) │ │userId     (FK) │ │           │
│          │ │updated│ │updated │ │created│ │created  │ │createdAt     │ │createdAt       │ │           │
│          │ │       │ │        │ │updated│ │         │ │              │ │                │ │           │
└─────────┘ └───────┘ └────────┘ └───────┘ └─────────┘ └──────────────┘ └────────────────┘ └────────────┘
```

### Relationship Summary

```
User (1) ─── (N) RefreshToken        User can have multiple active sessions
User (1) ─── (N) Income              User records multiple income entries
User (1) ─── (N) Expense             User records multiple expenses
User (1) ─── (N) Budget              User sets budgets per category/period
User (1) ─── (N) Alert               System generates alerts per user
User (1) ─── (N) Recommendation      System generates recommendations per user
User (1) ─── (N) ForecastSnapshot    System creates periodic financial snapshots
User (1) ─── (N) Notification        System sends notifications per user
```

All relationships cascade on delete: when a User is deleted, all associated records are automatically removed.

---

## Indexing Strategy

The database uses strategic indexes to optimize query performance for the most common access patterns.

### Primary Key Indexes

Every model has an automatically indexed primary key (`id`). These are created by Prisma by default.

### Unique Indexes

| Model        | Field(s) | Purpose                                      |
| ------------ | -------- | -------------------------------------------- |
| User         | `email`  | Ensures no duplicate registrations; fast login lookups |
| RefreshToken | `token`  | Fast token validation during refresh/logout  |

### Foreign Key Indexes

All `userId` foreign key fields are automatically indexed by Prisma to optimize:
- Filtering records by user (the most common query pattern)
- JOIN operations for user-scoped data retrieval
- CASCADE delete performance

### Composite and Functional Indexes

The following indexes are recommended for optimal performance with common query patterns:

| Model    | Fields                     | Purpose                                            |
| -------- | -------------------------- | -------------------------------------------------- |
| Expense  | `userId`, `date`           | Efficient date-range queries per user              |
| Expense  | `userId`, `category`       | Fast category filtering per user                   |
| Expense  | `userId`, `category`, `date` | Optimized category+date range queries (analytics)|
| Income   | `userId`, `date`           | Efficient date-range queries for income            |
| Budget   | `userId`, `category`, `period` | Fast budget lookups per category and period     |
| Alert    | `userId`, `isRead`         | Quick unread alert counts and filtering            |
| Alert    | `userId`, `createdAt`      | Chronological alert listing                        |
| Notification | `userId`, `isRead`     | Quick unread notification counts                   |
| Notification | `userId`, `createdAt`  | Chronological notification listing                 |
| ForecastSnapshot | `userId`, `forecastDate` | Latest forecast retrieval per user           |
| RefreshToken | `userId`               | Fast token lookup during auth operations           |

### Query Optimization Notes

1. **Date-range queries** are the most frequent pattern in this application (expense lists, reports, analytics). The composite indexes on `(userId, date)` ensure these queries use index scans rather than sequential scans.

2. **Category aggregations** (e.g., expenses by category, budget status checks) benefit from the `(userId, category)` index, avoiding full table scans when computing category totals.

3. **Unread counts** for alerts and notifications use the `(userId, isRead)` index to provide constant-time lookups for badge counts shown in the UI.

4. **Forecast retrieval** typically fetches the most recent snapshot, so the `(userId, forecastDate)` index with a descending sort allows the database to return the first matching row immediately.

5. **Pagination** queries across all models benefit from the primary key index and the composite indexes above, ensuring consistent performance regardless of dataset size.
