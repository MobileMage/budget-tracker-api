/**
 * All recognised expense category values.
 *
 * These strings match the ExpenseCategory enum used throughout the
 * application (database, validation, API responses).
 *
 * @type {string[]}
 */
const EXPENSE_CATEGORIES = [
  'FOOD',
  'TRANSPORT',
  'ENTERTAINMENT',
  'SHOPPING',
  'UTILITIES',
  'HOUSING',
  'HEALTHCARE',
  'EDUCATION',
  'PERSONAL_CARE',
  'TRAVEL',
  'GIFTS',
  'SUBSCRIPTIONS',
  'OTHER',
];

/**
 * Map from category value to a human-readable display name.
 *
 * @type {Record<string, string>}
 *
 * @example
 *   CATEGORY_DISPLAY_NAMES['PERSONAL_CARE']; // 'Personal Care'
 */
const CATEGORY_DISPLAY_NAMES = {
  FOOD: 'Food & Dining',
  TRANSPORT: 'Transport',
  ENTERTAINMENT: 'Entertainment',
  SHOPPING: 'Shopping',
  UTILITIES: 'Utilities',
  HOUSING: 'Housing & Rent',
  HEALTHCARE: 'Healthcare',
  EDUCATION: 'Education',
  PERSONAL_CARE: 'Personal Care',
  TRAVEL: 'Travel',
  GIFTS: 'Gifts & Donations',
  SUBSCRIPTIONS: 'Subscriptions',
  OTHER: 'Other',
};

module.exports = {
  EXPENSE_CATEGORIES,
  CATEGORY_DISPLAY_NAMES,
};
