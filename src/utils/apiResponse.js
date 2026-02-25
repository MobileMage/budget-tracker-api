/**
 * Send a successful JSON response.
 *
 * Response shape:
 * ```json
 * {
 *   "success": true,
 *   "message": "Operation completed",
 *   "data": { ... }
 * }
 * ```
 *
 * @param {import('express').Response} res  - Express response object
 * @param {*}      [data=null]             - Payload to include under the `data` key
 * @param {string} [message='Success']     - Human-readable success message
 * @param {number} [statusCode=200]        - HTTP status code
 * @returns {import('express').Response}
 */
const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send an error JSON response.
 *
 * Response shape:
 * ```json
 * {
 *   "success": false,
 *   "message": "Something went wrong",
 *   "errors": [ ... ]
 * }
 * ```
 *
 * @param {import('express').Response} res  - Express response object
 * @param {string} [message='Internal Server Error'] - Human-readable error message
 * @param {number} [statusCode=500]                  - HTTP status code
 * @param {Array|null} [errors=null]                 - Optional array of detailed error objects or strings
 * @returns {import('express').Response}
 */
const error = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
  const body = {
    success: false,
    message,
  };

  if (errors !== null) {
    body.errors = errors;
  }

  return res.status(statusCode).json(body);
};

module.exports = {
  success,
  error,
};
