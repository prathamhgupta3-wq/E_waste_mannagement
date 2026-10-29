const supabaseAuthService = require('../services/supabaseAuthService');
const db = require('../services/dbStore');

/**
 * Authentication & Identity Controller (Supabase Auth Integrated)
 */
const authController = {
  // POST /api/auth/register
  async register(req, res, next) {
    try {
      const result = await supabaseAuthService.register(req.body);
      return res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const result = await supabaseAuthService.login(req.body);
      return res.status(200).json({
        success: true,
        message: 'Authentication successful.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/logout
  async logout(req, res) {
    // In a stateless JWT architecture, logging out on server clears client session
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  },

  // GET /api/auth/profile & GET /api/auth/me
  async getProfile(req, res) {
    const user = db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }

    const responseData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    if (user.role === 'COLLECTOR') {
      const collectorProfile = db.findCollectorProfileByUserId(user.id);
      if (collectorProfile) {
        responseData.collectorProfile = collectorProfile;
      }
    }

    return res.status(200).json({
      success: true,
      data: responseData
    });
  },

  // PUT /api/auth/profile
  async updateProfile(req, res, next) {
    try {
      const { name, phone, businessName, serviceAreas } = req.body;
      const updatedUser = db.updateUser(req.user.id, { name, phone });

      if (!updatedUser) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }

      let collectorProfile = null;
      if (updatedUser.role === 'COLLECTOR') {
        collectorProfile = db.updateCollectorProfile(req.user.id, {
          businessName,
          serviceAreas: Array.isArray(serviceAreas) ? serviceAreas : (serviceAreas ? [serviceAreas] : undefined)
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
          updatedAt: updatedUser.updatedAt,
          collectorProfile
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/auth/role
  async getRole(req, res) {
    return res.status(200).json({
      success: true,
      data: {
        userId: req.user.id,
        role: req.user.role
      }
    });
  },

  // POST /api/admin/provision-admin
  // Protected: Only existing ADMIN role can provision a new administrator!
  async provisionAdmin(req, res, next) {
    try {
      const newAdmin = await supabaseAuthService.provisionAdmin(req.body);
      return res.status(201).json({
        success: true,
        message: `Administrator '${newAdmin.email}' provisioned securely.`,
        data: newAdmin
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/demo-login
  async demoLogin(req, res, next) {
    try {
      const { role } = req.body;
      const targetRole = (role || 'CITIZEN').toUpperCase();

      const roleMapping = {
        CITIZEN: 'sarah.chen@example.com',
        COLLECTOR: 'marcus.v@ecocircuit.fleet',
        ADMIN: 'admin@ecocircuit.org'
      };

      const email = roleMapping[targetRole];
      const result = await supabaseAuthService.login({ email, password: 'Password123!' });

      return res.status(200).json({
        success: true,
        message: `Authenticated as demo ${targetRole}.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = authController;
