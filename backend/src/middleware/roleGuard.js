/**
 * Role-Based Access Control (RBAC) Guard Middleware
 * Enforces that req.user has one of the allowed roles.
 * Never trusts role sent by frontend.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User authentication is required.'
      });
    }

    const userRole = req.user.role.toUpperCase();
    const hasRole = allowedRoles.map(r => r.toUpperCase()).includes(userRole);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Access denied. Required role: [${allowedRoles.join(', ')}]. Your verified role: ${userRole}.`
      });
    }

    next();
  };
}

module.exports = requireRole;
