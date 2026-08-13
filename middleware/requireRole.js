import ApiError from '../utils/ApiError.js';

// Runs AFTER verifyAdminToken (needs req.admin already set). Restricts a
// route to specific admin roles — e.g. only 'super_admin' can manage other
// admin accounts (AdminManagement.jsx), while regular 'admin' covers
// day-to-day product/order/discount operations.
//
// Usage: router.post('/admins', verifyAdminToken, requireRole('super_admin'), controller)
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.admin) {
    next(ApiError.unauthorized('Missing or invalid session.'));
    return;
  }
  if (!allowedRoles.includes(req.admin.role)) {
    next(ApiError.forbidden("You don't have permission to perform this action."));
    return;
  }
  next();
};

export default requireRole;