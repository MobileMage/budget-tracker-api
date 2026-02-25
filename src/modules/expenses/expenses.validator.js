const { z } = require('zod');

/**
 * Valid values for the Prisma ExpenseCategory enum.
 * @type {[string, ...string[]]}
 */
const EXPENSE_CATEGORY_VALUES = [
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

/**
 * Schema for creating a new expense record.
 *
 * @property {number} amount   - Positive number representing the expense amount.
 * @property {string} category - One of the ExpenseCategory enum values.
 * @property {string} date     - ISO 8601 date string, coerced to a Date object.
 * @property {string} [notes]  - Optional notes about the expense.
 */
const createExpenseSchema = z.object({
  amount: z
    .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be a positive number'),
  category: z.enum(EXPENSE_CATEGORY_VALUES, {
    required_error: 'Category is required',
    invalid_type_error: 'Category must be a string',
    message: `Category must be one of: ${EXPENSE_CATEGORY_VALUES.join(', ')}`,
  }),
  date: z.coerce.date({
    required_error: 'Date is required',
    invalid_type_error: 'Date must be a valid ISO date string',
  }),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes must be at most 1000 characters')
    .optional(),
});

/**
 * Schema for updating an existing expense record.
 * All fields are optional; at least one should be provided.
 */
const updateExpenseSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be a positive number')
    .optional(),
  category: z
    .enum(EXPENSE_CATEGORY_VALUES, {
      invalid_type_error: 'Category must be a string',
      message: `Category must be one of: ${EXPENSE_CATEGORY_VALUES.join(', ')}`,
    })
    .optional(),
  date: z.coerce
    .date({ invalid_type_error: 'Date must be a valid ISO date string' })
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes must be at most 1000 characters')
    .nullable()
    .optional(),
});

/**
 * Schema for querying expense records with optional filters and pagination.
 *
 * @property {string}  [startDate]  - ISO date string for range start (inclusive).
 * @property {string}  [endDate]    - ISO date string for range end (inclusive).
 * @property {string}  [category]   - Filter by expense category.
 * @property {number}  [page=1]     - Page number, minimum 1.
 * @property {number}  [limit=10]   - Items per page, 1-100.
 * @property {string}  [sortBy]     - Field to sort by (date, amount, category).
 * @property {string}  [sortOrder]  - Sort direction (asc or desc).
 */
const queryExpenseSchema = z.object({
  startDate: z.coerce
    .date({ invalid_type_error: 'startDate must be a valid ISO date string' })
    .optional(),
  endDate: z.coerce
    .date({ invalid_type_error: 'endDate must be a valid ISO date string' })
    .optional(),
  category: z
    .enum(EXPENSE_CATEGORY_VALUES, {
      message: `Category must be one of: ${EXPENSE_CATEGORY_VALUES.join(', ')}`,
    })
    .optional(),
  page: z.coerce
    .number({ invalid_type_error: 'page must be a number' })
    .int('page must be an integer')
    .min(1, 'page must be at least 1')
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: 'limit must be a number' })
    .int('limit must be an integer')
    .min(1, 'limit must be at least 1')
    .max(100, 'limit must be at most 100')
    .default(10),
  sortBy: z
    .enum(['date', 'amount', 'category'], {
      message: 'sortBy must be one of: date, amount, category',
    })
    .default('date'),
  sortOrder: z
    .enum(['asc', 'desc'], {
      message: 'sortOrder must be asc or desc',
    })
    .default('desc'),
});

module.exports = {
  createExpenseSchema,
  updateExpenseSchema,
  queryExpenseSchema,
  EXPENSE_CATEGORY_VALUES,
};
