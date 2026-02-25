# Features Guide

This document provides a detailed explanation of all 11 features in the Student Budget and Expense Tracking System, including the algorithms, thresholds, and logic that power the intelligent capabilities.

---

## Table of Contents

1. [User Authentication and Profile Management](#1-user-authentication-and-profile-management)
2. [Income Management](#2-income-management)
3. [Expense Tracking](#3-expense-tracking)
4. [Budget Planning and Control](#4-budget-planning-and-control)
5. [Overspending Pattern Detection](#5-overspending-pattern-detection)
6. [Impulse Spending Detection](#6-impulse-spending-detection)
7. [Behavioral Spending Analytics](#7-behavioral-spending-analytics)
8. [Smart Saving Recommendations](#8-smart-saving-recommendations)
9. [Financial Health and Survival Forecast](#9-financial-health-and-survival-forecast)
10. [Reports and Visualization Data](#10-reports-and-visualization-data)
11. [Smart Notifications](#11-smart-notifications)

---

## 1. User Authentication and Profile Management

### Overview

Provides secure user registration, login, session management, and profile administration. The system uses a dual-token JWT strategy to balance security with user convenience.

### How It Works

**Registration:**
- Users register with their name, email, password, monthly allowance amount, and optional allowance cycle (WEEKLY, BIWEEKLY, MONTHLY).
- Passwords are hashed using bcrypt with a salt factor of 10 before storage.
- Upon successful registration, both an access token and a refresh token are issued.

**Login:**
- Users authenticate with email and password.
- The system verifies the password against the stored bcrypt hash.
- A new access/refresh token pair is issued on each successful login.

**Token Management:**
- Access tokens are short-lived (default: 15 minutes) and carry the user ID in their payload.
- Refresh tokens are long-lived (default: 7 days) and stored as hashed values in the database.
- Token refresh issues a new pair and invalidates the old refresh token (rotation).
- Logout deletes the refresh token from the database, preventing further renewal.

**Profile Management:**
- Users can view and update their name, monthly allowance, and allowance cycle.
- Password changes require the current password for verification.
- Account deletion is permanent and cascades to all associated data.

### Security Measures

- Password validation requires minimum 8 characters with uppercase, lowercase, and numeric characters.
- Refresh tokens are stored as hashed values (not plaintext) in the database.
- Token rotation on refresh prevents token reuse attacks.
- Rate limiting on auth endpoints prevents brute-force attacks.

---

## 2. Income Management

### Overview

Allows students to record, track, and manage their income from various sources such as allowances, part-time jobs, scholarships, or gifts.

### How It Works

- Each income record consists of a source name, amount, date, and optional description.
- Income records are scoped to the authenticated user and cannot be accessed by others.
- The system supports pagination, date-range filtering, and sorting for income listings.
- A dedicated total endpoint aggregates income over a specified period, which is used by other features (forecasting, analytics, reports) to calculate net financial position.

### Key Behaviors

- If no date is provided when creating an income record, the current timestamp is used.
- Income records participate in the financial health calculation: total balance equals sum of all income minus sum of all expenses.
- Income creation time is tracked and used by impulse spending detection to identify post-income spending surges.

---

## 3. Expense Tracking

### Overview

The core feature that records and categorizes all spending transactions. Expense creation is the primary trigger for the system's intelligent detection features.

### How It Works

- Each expense includes a description, amount, category, and date.
- Expenses are classified into one of eight categories: FOOD, TRANSPORT, ENTERTAINMENT, SHOPPING, UTILITIES, HEALTH, EDUCATION, OTHER.
- The system supports pagination, filtering by category/date/amount range, and sorting.
- A by-category endpoint provides aggregated totals with percentages for visualization.
- A total endpoint computes aggregate spending over any date range.

### Trigger Chain

When a new expense is created, the following checks execute automatically in the background:

1. **Overspending check**: Compares category spending against the active budget for that category.
2. **Impulse frequency check**: Counts recent purchases within a 60-minute window.
3. **Late-night check**: Evaluates whether the expense occurred between 11:00 PM and 2:00 AM.
4. **Post-income check**: Determines whether income was received within the last 24 hours.

These checks happen asynchronously and do not delay the expense creation response.

---

## 4. Budget Planning and Control

### Overview

Enables students to set spending limits for specific categories over defined time periods, providing structure and guardrails for financial discipline.

### How It Works

- Users create budgets by specifying a category, a monetary limit, and a period (WEEKLY, BIWEEKLY, MONTHLY).
- Optional start and end dates allow explicit budget windows; if omitted, the system calculates them based on the period.
- The budget status endpoint calculates real-time spending progress for all active budgets.

### Budget Status Calculation

For each active budget, the system:

1. Identifies the current budget period based on `startDate` and `endDate`.
2. Sums all expenses in the matching category within that period.
3. Calculates percentage used: `(totalSpent / budgetAmount) * 100`.
4. Assigns a status:
   - **ON_TRACK**: Less than 80% of budget used.
   - **WARNING**: Between 80% and 100% of budget used.
   - **EXCEEDED**: More than 100% of budget used.
5. Computes remaining amount: `budgetAmount - totalSpent` (can be negative).

---

## 5. Overspending Pattern Detection

### Overview

Automatically detects when a user exceeds their budget for a given category and generates alerts. This is the first line of defense against uncontrolled spending.

### Threshold Logic

The overspending detection triggers when total spending in a budget category exceeds the budget limit by more than 10%.

```
Overspending Threshold = Budget Amount * 1.10

If (Total Category Spending > Overspending Threshold):
    Generate OVERSPEND alert
```

### Detailed Algorithm

1. When an expense is created, the system identifies all active budgets for the expense's category and user.
2. For each matching budget, it sums all expenses in that category within the budget's active period (startDate to endDate).
3. It calculates the overspend ratio: `totalSpent / budgetAmount`.
4. If the ratio exceeds 1.10 (110%), an OVERSPEND alert is created.
5. The alert includes the budget amount, the actual spending amount, and the overspend percentage.

### Example

```
Budget: FOOD = 3,000.00 (Monthly)
Overspend Threshold: 3,000.00 * 1.10 = 3,300.00

Scenario 1: Total FOOD spending = 3,100.00
    Ratio = 3,100 / 3,000 = 1.033 (103.3%)
    Result: No alert (below 110% threshold)

Scenario 2: Total FOOD spending = 3,450.00
    Ratio = 3,450 / 3,000 = 1.15 (115%)
    Result: OVERSPEND alert generated
    Message: "You have exceeded your FOOD budget by 15%.
              Budget: 3,000.00, Spent: 3,450.00"
```

### Why 10% Over Budget?

The 10% buffer exists to avoid alert fatigue. Students often slightly exceed budgets due to rounding or minor unplanned expenses. The system only alerts when overspending becomes a meaningful pattern. The budget status endpoint still shows WARNING status at 80% and EXCEEDED at 100%, giving users earlier visibility through the status check without generating alerts.

---

## 6. Impulse Spending Detection

### Overview

Identifies behavioral patterns that indicate impulsive or emotionally driven spending. Three distinct detection algorithms work together to catch different impulse patterns.

### Detection Algorithm 1: Rapid-Fire Purchases

**Trigger condition:** Three or more purchases within a 60-minute window.

```
Time Window = 60 minutes

On new expense creation:
    1. Query all expenses by this user in the last 60 minutes
    2. Count = number of expenses (including the new one)
    3. If Count >= 3:
        Total = sum of amounts in the window
        Generate IMPULSE alert:
        "You made {Count} purchases within 60 minutes
         totaling {Total}"
```

**Rationale:** Rapid sequential purchases often indicate shopping sprees or emotionally driven buying. A student making three or more purchases in an hour is likely in a store or online shopping session and may benefit from a pause.

### Detection Algorithm 2: Late-Night Spending

**Trigger condition:** Any expense made between 11:00 PM (23:00) and 2:00 AM (02:00).

```
On new expense creation:
    1. Extract the hour from the expense timestamp
    2. If hour >= 23 OR hour < 2:
        Generate IMPULSE alert:
        "Late-night spending detected at {time}.
         Late-night purchases are often impulsive."
```

**Rationale:** Research shows that late-night purchases are disproportionately impulsive. Decision-making quality degrades with fatigue, and late-night online shopping is a common impulse behavior pattern among students.

### Detection Algorithm 3: Post-Income Impulse

**Trigger condition:** A large expense within 24 hours of receiving income.

```
On new expense creation:
    1. Query the user's most recent income record
    2. If income was received within the last 24 hours:
        3. Determine if the expense is "large" relative to income
           (heuristic: expense amount > 20% of the income amount)
        4. If yes:
            Generate IMPULSE alert:
            "Large purchase detected within 24 hours of receiving
             income. This is a common impulse spending pattern."
```

**Rationale:** The "payday effect" is well documented in behavioral economics. People tend to spend more freely immediately after receiving money. By flagging large purchases within 24 hours of income, the system helps students recognize this pattern.

### Alert Deduplication

To prevent alert fatigue, the system implements basic deduplication:
- Only one rapid-fire alert is generated per 60-minute window, even if multiple qualifying clusters are detected.
- Late-night alerts are generated per expense (each late-night purchase gets its own alert).
- Post-income alerts check for existing alerts of the same type within the 24-hour window to avoid duplicates.

---

## 7. Behavioral Spending Analytics

### Overview

Provides data-driven insights into spending behavior through multiple analytical lenses. These endpoints return structured data suitable for frontend visualization.

### Spending Heatmap

**Endpoint:** `GET /api/analytics/heatmap`

Generates a matrix of spending intensity by day of week and hour of day. Each cell contains the total amount spent and the number of transactions for that time slot.

**Algorithm:**
1. Query all expenses within the date range for the user.
2. For each expense, extract the day of week (Monday through Sunday) and the hour (0-23).
3. Group by (day, hour) and compute:
   - `total`: sum of amounts in that time slot
   - `count`: number of transactions in that time slot
4. Return as a flat array of objects for flexible frontend rendering.

**Use case:** Helps students identify when they spend the most. For example, a student may discover they spend heavily on Friday evenings (entertainment) or weekday lunchtimes (food).

### Category Dominance

**Endpoint:** `GET /api/analytics/category-dominance`

Ranks spending categories by total expenditure and calculates each category's share of total spending.

**Algorithm:**
1. Sum all expenses grouped by category within the date range.
2. Calculate total spending across all categories.
3. For each category, compute: `percentage = (categoryTotal / grandTotal) * 100`.
4. Rank categories by total amount in descending order.

**Use case:** Reveals which areas consume the most financial resources. A student spending 45% on entertainment might reconsider their priorities.

### Spending Trend

**Endpoint:** `GET /api/analytics/spending-trend`

Shows daily spending totals over time, optionally filtered by category.

**Algorithm:**
1. Query expenses within the date range, optionally filtered by category.
2. Group by date (truncated to day).
3. For each date, compute: `total` (sum) and `count` (transaction count).
4. Calculate the overall daily average across the period.

**Use case:** Enables students to spot escalating spending patterns. A rising trend line suggests spending is increasing and may need intervention.

### Summary

**Endpoint:** `GET /api/analytics/summary`

Provides a comprehensive financial overview combining income, expenses, budgets, and savings data.

**Computed metrics:**
- `totalIncome`: Sum of all income in the period.
- `totalExpenses`: Sum of all expenses in the period.
- `netSavings`: `totalIncome - totalExpenses`.
- `savingsRate`: `(netSavings / totalIncome) * 100`.
- `topCategory`: The category with the highest spending.
- `totalTransactions`: Count of expense records.
- `averageDailySpend`: `totalExpenses / numberOfDaysInPeriod`.
- `activeBudgets`: Count of budgets in the current period.
- `budgetsExceeded`: Count of budgets where spending exceeds the limit.

### Weekly Comparison

**Endpoint:** `GET /api/analytics/weekly-comparison`

Compares the current week's spending against the previous week.

**Algorithm:**
1. Define the current week (Monday to Sunday) and the previous week.
2. Sum expenses and count transactions for each week.
3. Calculate the change:
   - `amount`: `currentWeekTotal - previousWeekTotal`
   - `percentage`: `((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100`
   - `direction`: `INCREASE` if positive, `DECREASE` if negative, `UNCHANGED` if zero.

**Use case:** Provides a simple week-over-week indicator. If spending increased by 30% compared to the previous week, the student knows to exercise more caution.

---

## 8. Smart Saving Recommendations

### Overview

A rule-based engine that analyzes the user's financial data and generates actionable, personalized saving recommendations. Recommendations are generated on demand and replace any previously generated set.

### Rule Engine

The recommendation engine evaluates a series of rules against the user's data. Each rule that matches produces one recommendation with a title, description, estimated savings, related category, and priority level (HIGH, MEDIUM, LOW).

### Rule Definitions

**Rule 1: Dominant Category Spending**
```
Condition: Any single category accounts for > 40% of total spending
Priority:  HIGH
Example:   "Your FOOD spending is 45% of total expenses.
            Consider meal prepping to reduce costs."
Savings:   Estimated as 15% of that category's total
```

**Rule 2: Budget Overrun**
```
Condition: Any budget has been exceeded (spent > budget amount)
Priority:  HIGH
Example:   "You exceeded your ENTERTAINMENT budget by 200.00.
            Set a daily spending cap for this category."
Savings:   The overspent amount
```

**Rule 3: High Budget Utilization**
```
Condition: Any budget is between 80% and 100% utilized
Priority:  MEDIUM
Example:   "You've used 85% of your TRANSPORT budget with
            10 days remaining. Reduce trips or use cheaper
            alternatives."
Savings:   Estimated as 10% of the budget amount
```

**Rule 4: Low Savings Rate**
```
Condition: Savings rate (income - expenses) / income < 10%
Priority:  HIGH
Example:   "Your savings rate is only 5%. Aim for at least
            20% by cutting discretionary spending."
Savings:   Difference between current rate and 20% target
           applied to monthly income
```

**Rule 5: High Entertainment Spending**
```
Condition: ENTERTAINMENT category > 20% of total spending
Priority:  MEDIUM
Example:   "Entertainment accounts for 25% of your spending.
            Look for free campus events and student discounts."
Savings:   Estimated as 30% of entertainment spending
```

**Rule 6: Frequent Small Purchases**
```
Condition: More than 20 transactions under 100.00 in the
           last 30 days
Priority:  LOW
Example:   "You made 28 small purchases this month.
            Small expenses add up quickly - consider
            batching your purchases."
Savings:   Estimated as 20% of the total small purchase amount
```

**Rule 7: Weekend Spending Spike**
```
Condition: Weekend spending > 40% of total weekly spending
Priority:  MEDIUM
Example:   "You spend 55% of your weekly budget on weekends.
            Plan free weekend activities to reduce this."
Savings:   Estimated as 25% of weekend spending
```

**Rule 8: No Budget Set**
```
Condition: User has expenses in categories without budgets
Priority:  LOW
Example:   "You have no budget for SHOPPING but spent 1,200.00
            this month. Setting a budget helps control spending."
Savings:   Estimated as 10% of unbudgeted category spending
```

**Rule 9: Impulse Alert Frequency**
```
Condition: More than 3 impulse alerts in the last 7 days
Priority:  HIGH
Example:   "You triggered 5 impulse spending alerts this week.
            Consider implementing a 24-hour rule before
            non-essential purchases."
Savings:   Estimated based on average impulse purchase amount
```

**Rule 10: Post-Income Spending Surge**
```
Condition: More than 30% of monthly income spent within
           48 hours of receiving it
Priority:  HIGH
Example:   "You spent 35% of your income within 2 days of
            receiving it. Allocate your allowance immediately
            upon receipt."
Savings:   Estimated as the amount exceeding 20% within
           the window
```

### Generation Behavior

- Calling the generate endpoint clears all existing recommendations for the user and creates a fresh set.
- Multiple rules can match simultaneously, producing multiple recommendations.
- Rules are evaluated in priority order (HIGH first).
- If no rules match, no recommendations are generated and a message indicates the user's finances are in good shape.

---

## 9. Financial Health and Survival Forecast

### Overview

Calculates how long the user's current funds will last based on their spending velocity. This is the most critical intelligent feature, providing a clear, quantified answer to the question: "How many days can I survive on my current balance?"

### Core Formulas

**Total Balance:**
```
Total Balance = Sum(all income) - Sum(all expenses)
```

**Daily Burn Rate (7-day rolling average):**
```
Daily Burn Rate = Sum(expenses in last 7 days) / 7
```

The 7-day window provides a balance between responsiveness to recent changes and smoothing out day-to-day variation. Using a longer window (e.g., 30 days) would be too slow to react to spending spikes; using a shorter window (e.g., 3 days) would be too volatile.

**Survival Days:**
```
If Daily Burn Rate = 0:
    Survival Days = Infinity (displayed as 999)
Else If Total Balance <= 0:
    Survival Days = 0
Else:
    Survival Days = Floor(Total Balance / Daily Burn Rate)
```

### Risk Meter Thresholds

The risk level provides an at-a-glance indicator of financial health:

| Risk Level | Survival Days | Interpretation                                     |
| ---------- | ------------- | -------------------------------------------------- |
| **SAFE**   | > 30 days     | Finances are stable. Current spending is sustainable for more than a month. |
| **WARNING**| 15 - 30 days  | Caution needed. Funds will be depleted in 2-4 weeks at the current rate. |
| **DANGER** | < 15 days     | Immediate action required. Funds will run out within two weeks. |

### Snapshot vs. Real-Time

The forecast module provides two modes:

1. **Snapshot (POST /api/forecast/generate):** Creates a permanent record saved to the database. Useful for tracking financial health over time. The history endpoint shows how risk levels have changed.

2. **Real-time (GET /api/forecast/health):** Computes the forecast on the fly without saving. Includes additional context like days until the next allowance and projected end-of-month balance.

### Projected End-of-Month Balance

```
Days Remaining in Month = Last Day of Month - Today
Projected End of Month Balance = Total Balance - (Daily Burn Rate * Days Remaining)
```

A negative projected balance indicates the user is on track to run out of money before the month ends.

### Example Scenario

```
Student: Jane
Monthly Allowance: 5,000.00
Income This Month: 5,000.00
Expenses This Month: 3,800.00
Total Balance: 1,200.00

Last 7 Days of Expenses:
  Day 1: 150.00
  Day 2: 200.00
  Day 3: 180.00
  Day 4: 250.00
  Day 5: 100.00
  Day 6: 300.00
  Day 7: 120.00
  Total: 1,300.00

Daily Burn Rate: 1,300.00 / 7 = 185.71
Survival Days: Floor(1,200.00 / 185.71) = 6 days
Risk Level: DANGER (< 15 days)

Days Remaining in February: 3
Projected End of Month: 1,200.00 - (185.71 * 3) = 642.87

Recommendation: "Your funds will last approximately 6 days at
your current spending rate. Reduce spending immediately to
avoid running out before your next allowance."
```

---

## 10. Reports and Visualization Data

### Overview

Generates structured financial reports for different time periods, providing comprehensive snapshots of the user's financial activity. Reports aggregate data from income, expenses, and budgets into a single view.

### Report Types

**Monthly Report:**
- Full month financial summary including income breakdown by source, expense breakdown by category with percentages, budget status for all active budgets, and net savings with savings rate.
- Accepts month and year parameters; defaults to the current month.

**Weekly Report:**
- Seven-day financial summary with a daily breakdown showing expenses and transaction counts for each day.
- Identifies top spending categories for the week.
- Accepts a start date; defaults to the current week (Monday to Sunday).

**Custom Report:**
- Flexible date range report covering any period the user specifies.
- Includes all metrics from the monthly report calculated over the custom period.
- Requires both startDate and endDate parameters.

**Export:**
- Generates downloadable data in JSON or CSV format.
- Can export expenses only, income only, or all financial data.
- CSV exports include headers and are formatted for spreadsheet import.

### Data Structure

All reports follow a consistent structure:
- **Period metadata**: Start date, end date, and human-readable label.
- **Income section**: Total income with source breakdown.
- **Expense section**: Total expenses with category breakdown including counts and percentages.
- **Budget section**: Active budget count, exceeded count, and per-budget details.
- **Savings section**: Net amount saved and savings rate as a percentage.

---

## 11. Smart Notifications

### Overview

The notification system delivers timely, relevant information to users through two mechanisms: event-driven notifications triggered by system events, and scheduled notifications generated by cron jobs.

### Notification Types

| Type             | Trigger                           | Description                                     |
| ---------------- | --------------------------------- | ----------------------------------------------- |
| `WEEKLY_DIGEST`  | Cron job (Monday 8:00 AM)         | Summary of the previous week's financial activity |
| `BUDGET_WARNING` | Budget reaches 80% utilization    | Warning that a budget is nearly exhausted        |
| `BUDGET_EXCEEDED`| Budget exceeds 100%               | Alert that a budget has been exceeded            |
| `FORECAST_DANGER`| Forecast risk level is DANGER     | Urgent alert about critically low financial runway |

### Weekly Digest Cron Job

The weekly digest is generated every Monday at 8:00 AM via a `node-cron` scheduled task.

**Process:**

1. The cron job queries all registered users.
2. For each user, it computes:
   - Total spending for the previous week (Monday to Sunday).
   - Transaction count for the previous week.
   - Top spending category with amount.
   - Comparison with the week before (percentage change).
   - Number of budgets currently exceeded.
3. It composes a notification with a structured summary message.
4. The notification is saved with type `WEEKLY_DIGEST` and `isRead: false`.

**Example digest message:**

```
Weekly Spending Summary (Feb 17 - Feb 23):

You spent 2,100.00 across 18 transactions this week.

Top category: FOOD (900.00)
Week-over-week change: +16.7% (increase of 300.00)

Budget Status: 1 of 3 budgets exceeded.

Review your spending in the Analytics section for more details.
```

### Notification Management

Users can:
- List all notifications with pagination and read/unread filtering.
- Check the unread count for badge display in the UI.
- Mark individual notifications as read.
- Mark all notifications as read in bulk.
- Delete individual notifications.
- Delete all read notifications in bulk to clean up the list.

### Design Considerations

- Notifications are stored in the database, not sent via email or push. The API is designed for a frontend to poll or display notifications within the application.
- The cron job runs in the main Node.js process. In multi-instance deployments, ensure only one instance runs the cron to avoid duplicate notifications.
- Notification records are lightweight (title + message) and can accumulate over time. The bulk delete of read notifications provides a cleanup mechanism.
