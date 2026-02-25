const { z } = require('zod');

/**
 * Schema for creating a new income record.
 *
 * @property {number} amount   - Positive number representing the income amount.
 * @property {string} source   - Non-empty string describing the income source.
 * @property {string} date     - ISO 8601 date string, coerced to a Date object.
 * @property {string} [notes]  - Optional notes about the income.
 */
const createIncomeSchema = z.object({
  amount: z
    .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be a positive number'),
  source: z
    .string({ required_error: 'Source is required' })
    .trim()
    .min(1, 'Source cannot be empty')
    .max(255, 'Source must be at most 255 characters'),
  date: z.coerce.date({ required_error: 'Date is required', invalid_type_error: 'Date must be a valid ISO date string' }),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes must be at most 1000 characters')
    .optional(),
});

/**
 * Schema for updating an existing income record.
 * All fields are optional; at least one should be provided.
 */
const updateIncomeSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be a positive number')
    .optional(),
  source: z
    .string()
    .trim()
    .min(1, 'Source cannot be empty')
    .max(255, 'Source must be at most 255 characters')
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
 * Schema for querying income records with optional date filters and pagination.
 *
 * @property {string}  [startDate] - ISO date string for range start (inclusive).
 * @property {string}  [endDate]   - ISO date string for range end (inclusive).
 * @property {number}  [page=1]    - Page number, minimum 1.
 * @property {number}  [limit=10]  - Items per page, 1-100.
 */
const queryIncomeSchema = z.object({
  startDate: z.coerce
    .date({ invalid_type_error: 'startDate must be a valid ISO date string' })
    .optional(),
  endDate: z.coerce
    .date({ invalid_type_error: 'endDate must be a valid ISO date string' })
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
});

module.exports = {
  createIncomeSchema,
  updateIncomeSchema,
  queryIncomeSchema,
};
