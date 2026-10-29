const supabaseAuthService = require('../services/supabaseAuthService');

async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: A Bearer token is required.'
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication token is missing.'
    });
  }

  try {
    const user = await supabaseAuthService.verifyToken(token);

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    };

    return next();
  } catch (err) {
    if (!err.statusCode || err.statusCode >= 500) {
      return next(err);
    }

    return res.status(err.statusCode).json({
      success: false,
      error: err.message || 'Unauthorized.'
    });
  }
}

module.exports = authenticateUser;
