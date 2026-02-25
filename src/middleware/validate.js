/**
 * Creates an Express middleware that validates `req.body` against the
 * provided Zod schema.
 *
 * On success the parsed (and potentially transformed) data replaces
 * `req.body` so downstream handlers receive clean, typed input.
 *
 * On failure the ZodError is forwarded to the next error-handling
 * middleware via `next(err)`.
 *
 * @param {import('zod').ZodSchema} schema - A Zod schema to validate against.
 * @returns {import('express').RequestHandler} Express middleware function.
 *
 * @example
 * const { z } = require('zod');
 * const validate = require('../middleware/validate');
 *
 * const createUserSchema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * });
 *
 * router.post('/users', validate(createUserSchema), userController.create);
 */
function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(result.error);
    }

    req.body = result.data;
    next();
  };
}

module.exports = validate;
