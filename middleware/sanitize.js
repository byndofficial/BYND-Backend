import mongoSanitize from 'express-mongo-sanitize';
import logger from '../utils/logger.js';

// Strips any request key starting with '$' or containing '.' from
// req.body/query/params — blocks NoSQL operator-injection payloads like
// { "email": { "$gt": "" } } before they ever reach a Mongoose query.
const sanitize = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`Sanitized a potentially malicious key "${key}" on ${req.method} ${req.originalUrl}`);
  },
});

export default sanitize;
