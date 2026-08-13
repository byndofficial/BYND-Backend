// Wraps an async route/controller function so any thrown error or
// rejected promise is forwarded to next(), instead of crashing the
// process or requiring a try/catch in every single controller.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
