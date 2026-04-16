'use strict';

const { sendBadRequest } = require('../utils/apiResponse');

/**
 * Zod schema validation middleware factory
 * @param {Object} schemas - { body, params, query } each a Zod schema
 */
function validate(schemas) {
  return function (req, res, next) {
    const errors = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.push(...result.error.errors.map((e) => ({
          field: `body.${e.path.join('.')}`,
          message: e.message,
        })));
      } else {
        req.body = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.push(...result.error.errors.map((e) => ({
          field: `params.${e.path.join('.')}`,
          message: e.message,
        })));
      } else {
        req.params = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.push(...result.error.errors.map((e) => ({
          field: `query.${e.path.join('.')}`,
          message: e.message,
        })));
      } else {
        req.query = result.data;
      }
    }

    if (errors.length > 0) {
      return sendBadRequest(res, 'Validation failed', errors);
    }

    next();
  };
}

module.exports = { validate };
