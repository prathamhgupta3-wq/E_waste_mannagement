const supabaseAuthService = require('../services/supabaseAuthService');
const prisma = require('../services/prisma');

const authController = {
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

  async logout(req, res) {
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  },

  async getProfile(req, res, next) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { collectorProfile: true }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User profile not found.'
        });
      }

      const { passwordHash, ...responseData } = user;

      return res.status(200).json({
        success: true,
        data: responseData
      });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const { name, phone, businessName, serviceAreas } = req.body;

      const data = {};

      if (typeof name === 'string' && name.trim()) {
        data.name = name.trim();
      }

      if (typeof phone === 'string' && phone.trim()) {
        data.phone = phone.trim();
      }

      const existing = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'User not found.'
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data
      });

      let collectorProfile = null;

      if (updatedUser.role === 'COLLECTOR') {
        const profileData = {};

        if (typeof businessName === 'string' && businessName.trim()) {
          profileData.businessName = businessName.trim();
        }

        if (serviceAreas !== undefined) {
          profileData.serviceAreas = Array.isArray(serviceAreas)
            ? serviceAreas
            : [serviceAreas];
        }

        if (phone !== undefined && typeof phone === 'string' && phone.trim()) {
          profileData.contactInfo = phone.trim();
        }

        collectorProfile = await prisma.collectorProfile.update({
          where: { userId: req.user.id },
          data: profileData
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

  async getRole(req, res) {
    return res.status(200).json({
      success: true,
      data: {
        userId: req.user.id,
        role: req.user.role
      }
    });
  },

  async provisionAdmin(req, res, next) {
    try {
      const newAdmin = await supabaseAuthService.provisionAdmin(req.body);

      return res.status(201).json({
        success: true,
        message: 'Administrator provisioned successfully.',
        data: newAdmin
      });
    } catch (err) {
      next(err);
    }
  },

  async demoLogin(req, res) {
    return res.status(404).json({
      success: false,
      error: 'Demo login is disabled.'
    });
  }
};

module.exports = authController;