const { z } = require('zod');

/**
 * Schema for updating the user profile request body.
 *
 * At least one field (name or allowanceCycle) must be provided.
 *
 * @property {string} [name]           - Optional, 1-100 characters.
 * @property {string} [allowanceCycle] - Optional, one of WEEKLY | BIWEEKLY | MONTHLY.
 */
const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name cannot be empty')
      .max(100, 'Name must be at most 100 characters')
      .optional(),
    allowanceCycle: z
      .enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY'], {
        errorMap: () => ({
          message: 'allowanceCycle must be one of WEEKLY, BIWEEKLY, or MONTHLY',
        }),
      })
      .optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.allowanceCycle !== undefined,
    { message: 'At least one field (name or allowanceCycle) must be provided' }
  );

/**
 * Schema for changing the user password request body.
 *
 * @property {string} currentPassword - Required, the current password.
 * @property {string} newPassword     - Required, minimum 8 characters.
 */
const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'Current password is required' })
    .min(1, 'Current password is required'),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(8, 'New password must be at least 8 characters'),
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
};
