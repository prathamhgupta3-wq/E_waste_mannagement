/**
 * Zod Schema Validation Middleware
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err.errors) {
        const issues = err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));
        return res.status(400).json({
          success: false,
          error: 'Validation failed. Please verify your input parameters.',
          details: issues
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Malformed request data.'
      });
    }
  };
}

module.exports = validate;
