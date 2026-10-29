const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');
const db = require('./dbStore');

// Initialize optional live Supabase Client if live credentials are provided
let supabaseClient = null;
if (
  config.supabase.url &&
  config.supabase.url !== 'https://demo.supabase.co' &&
  config.supabase.jwtSecret &&
  config.supabase.jwtSecret !== 'demo-supabase-jwt-secret'
) {
  try {
    supabaseClient = createClient(config.supabase.url, config.supabase.jwtSecret);
  } catch (err) {
    console.warn('Supabase client initialization skipped, utilizing local auth provider.');
  }
}

/**
 * Generate standard signed JWT session token
 */
function generateSessionToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

const supabaseAuthService = {
  /**
   * Register a new Citizen or Collector account.
   * Public registration as ADMIN is strictly prohibited!
   */
  async register({ email, password, name, phone, role, businessName, serviceAreas }) {
    const targetRole = (role || 'CITIZEN').toUpperCase();

    // Security Rule: Admin accounts must not be publicly self-registerable
    if (targetRole === 'ADMIN') {
      const error = new Error('Public registration as Administrator is strictly prohibited. Admin accounts must be securely provisioned by platform security.');
      error.statusCode = 403;
      throw error;
    }

    if (!['CITIZEN', 'COLLECTOR'].includes(targetRole)) {
      const error = new Error("Invalid role specified. Only 'CITIZEN' or 'COLLECTOR' may be registered publicly.");
      error.statusCode = 400;
      throw error;
    }

    // Check if email already exists
    const existing = db.findUserByEmail(email);
    if (existing) {
      const error = new Error(`An account with email '${email}' already exists.`);
      error.statusCode = 409;
      throw error;
    }

    // Create user in database
    const user = db.createUser({
      name,
      email,
      phone,
      password,
      role: targetRole
    });

    let collectorProfile = null;
    if (targetRole === 'COLLECTOR') {
      collectorProfile = db.createCollectorProfile({
        userId: user.id,
        businessName: businessName || `${user.name} Logistics`,
        phone: user.phone,
        verificationStatus: 'PENDING', // All new collectors require verification
        serviceAreas: serviceAreas || []
      });
    }

    const token = generateSessionToken(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        collectorProfile
      },
      token,
      redirectUrl: targetRole === 'COLLECTOR' ? '/dashboard/collector' : '/dashboard/citizen'
    };
  },

  /**
   * Log in an existing user (Citizen, Collector, or Admin)
   */
  async login({ email, password }) {
    const user = db.findUserByEmail(email);
    if (!user) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    const isValid = db.validatePassword(user, password);
    if (!isValid) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    const token = generateSessionToken(user);

    let collectorProfile = null;
    if (user.role === 'COLLECTOR') {
      collectorProfile = db.findCollectorProfileByUserId(user.id);
    }

    const redirectMapping = {
      CITIZEN: '/dashboard/citizen',
      COLLECTOR: '/dashboard/collector',
      ADMIN: '/dashboard/admin'
    };

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        collectorProfile
      },
      token,
      redirectUrl: redirectMapping[user.role] || '/dashboard'
    };
  },

  /**
   * Verify token and retrieve user from database
   */
  verifyToken(token) {
    if (!token) {
      const error = new Error('Missing authentication token.');
      error.statusCode = 401;
      throw error;
    }

    let decoded = null;

    // 1. Try Supabase JWT Secret
    try {
      decoded = jwt.verify(token, config.supabase.jwtSecret);
    } catch (e1) {
      // 2. Try Local Secret
      try {
        decoded = jwt.verify(token, config.jwt.secret);
      } catch (e2) {
        if (e2.name === 'TokenExpiredError') {
          const error = new Error('Authentication session has expired. Please sign in again.');
          error.statusCode = 401;
          throw error;
        }
        const error = new Error('Invalid authentication token.');
        error.statusCode = 401;
        throw error;
      }
    }

    const userId = decoded.sub || decoded.userId || decoded.id;
    const user = db.findUserById(userId) || (decoded.email ? db.findUserByEmail(decoded.email) : null);

    if (!user) {
      const error = new Error('User associated with token not found.');
      error.statusCode = 401;
      throw error;
    }

    return user;
  },

  /**
   * Secure Admin Provisioning:
   * Only existing verified Administrators can provision new Administrators.
   */
  async provisionAdmin({ name, email, phone, password }) {
    const existing = db.findUserByEmail(email);
    if (existing) {
      const error = new Error(`An account with email '${email}' already exists.`);
      error.statusCode = 409;
      throw error;
    }

    const newAdmin = db.createUser({
      name,
      email,
      phone,
      password,
      role: 'ADMIN'
    });

    return {
      id: newAdmin.id,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      createdAt: newAdmin.createdAt
    };
  }
};

module.exports = supabaseAuthService;
