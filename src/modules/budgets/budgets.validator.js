const { z } = require('zod');

const EXPENSE_CATEGORIES = [
  'FOOD',
  'TRANSPORT',
  'ENTERTAINMENT',
  'SHOPPING',
  'EDUCATION',
  'HEALTH',
  'UTILITIES',
  'RENT',
  'PERSONAL',
  'OTHER',
];

const BUDGET_PERIODS = ['WEEKLY', 'MONTHLY'];

/**
 * Schema for creating a new budget.
 *
 * @property {string} category  - One of the ExpenseCategory enum values.
 * @property {number} limit     - Positive number representing the budget cap.
 * @property {string} period    - Either "WEEKLY" or "MONTHLY".
 * @property {string} startDate - ISO 8601 date string, coerced to a Date object.
 */
const createBudgetSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, {
    required_error: 'Category is required',
    invalid_type_error: `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`,
  }),
  limit: z
    .number({ required_error: 'Limit is required', invalid_type_error: 'Limit must be a number' })
    .positive('Limit must be a positive number'),
  period: z.enum(BUDGET_PERIODS, {
    required_error: 'Period is required',
    invalid_type_error: 'Period must be either WEEKLY or MONTHLY',
  }),
  startDate: z
    .string({ required_error: 'Start date is required' })
    .datetime({ message: 'Start date must be a valid ISO 8601 date string' })
    .pipe(z.coerce.date()),
});

/**
 * Schema for updating an existing budget.
 *
 * Both fields are optional, but at least one should be provided by the caller.
 *
 * @property {number} [limit]  - Positive number representing the new budget cap.
 * @property {string} [period] - Either "WEEKLY" or "MONTHLY".
 */
const updateBudgetSchema = z.object({
  limit: z
    .number({ invalid_type_error: 'Limit must be a number' })
    .positive('Limit must be a positive number')
    .optional(),
  period: z
    .enum(BUDGET_PERIODS, {
      invalid_type_error: 'Period must be either WEEKLY or MONTHLY',
    })
    .optional(),
});

/**
 * Schema for query parameters when listing budgets.
 *
 * @property {string} [category] - Filter by expense category.
 * @property {string} [period]   - Filter by budget period.
 */
const queryBudgetSchema = z.object({
  category: z
    .enum(EXPENSE_CATEGORIES, {
      invalid_type_error: `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`,
    })
    .optional(),
  period: z
    .enum(BUDGET_PERIODS, {
      invalid_type_error: 'Period must be either WEEKLY or MONTHLY',
    })
    .optional(),
});

module.exports = {
  createBudgetSchema,
  updateBudgetSchema,
  queryBudgetSchema,
};
