const { badRequest } = require('../utils/httpError');

// validate({ body, query, params }) — each a zod schema. Parsed (coerced and
// stripped) values replace the originals so handlers only see known fields.
const validate = (schemas) => (req, res, next) => {
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(badRequest(details[0]?.message || 'Invalid request', details));
    }
    if (key === 'query') {
      // req.query is a getter in Express 5 and may be frozen; store separately.
      req.validatedQuery = result.data;
    } else {
      req[key] = result.data;
    }
  }
  next();
};

module.exports = validate;
