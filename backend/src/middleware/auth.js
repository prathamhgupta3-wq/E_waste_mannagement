const supabaseAuthService = require('../services/supabaseAuthService');
const config = require('../config/env');
const db = require('../services/dbStore');

/**
 * Authentication Middleware:
 * Verifies Supabase Auth JWT or local development session token.
 * Independently retrieves the authenticated user from the database.
 * Never trusts any role or identity supplied by the client.
 */
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;

  // 1. Check Authorization: Bearer <token>
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    try {
      const user = supabaseAuthService.verifyToken(token);

      // Attach verified identity and role from the database record
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role // Verified role from database
      };

      return next();
    } catch (err) {
      return res.status(err.statusCode || 401).json({
        success: false,
        error: err.message || 'Unauthorized: Invalid or expired authentication token.'
      });
    }
  }

  // 2. Developer Convenience: Support x-demo-user header in development mode
  if (config.nodeEnv === 'development' && req.headers['x-demo-user']) {
    const demoKey = req.headers['x-demo-user'].toLowerCase();
    const roleMapping = {
      citizen: 'user-citizen-01',
      collector: 'user-collector-01',
      admin: 'user-admin-01'
    };

    const targetId = roleMapping[demoKey];
    if (targetId) {
      const user = db.findUserById(targetId);
      if (user) {
        req.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        };
        return next();
      }
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Missing or malformed Authorization header. Please provide a Bearer token.'
  });
}

module.exports = authenticateUser;
