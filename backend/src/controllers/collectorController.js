const db = require('../services/dbStore');
const { isValidStatusTransition } = require('../validators/pickupValidator');

/**
 * Collector Management Controller
 */
const collectorController = {
  // GET /api/collector/assigned
  async getAssignedPickups(req, res) {
    const assigned = db.getAllPickupRequests({
      collectorId: req.user.id
    }).filter(p => p.currentStatus !== 'COMPLETED' && p.currentStatus !== 'CANCELLED');

    const profile = db.findCollectorProfileByUserId(req.user.id);

    const enriched = assigned.map(p => {
      const citizen = db.findUserById(p.citizenId);
      return {
        ...p,
        citizenName: citizen ? citizen.name : 'Citizen Partner',
        citizenPhone: citizen ? citizen.phone : 'Contact unavailable'
      };
    });

    return res.status(200).json({
      success: true,
      count: enriched.length,
      verificationStatus: profile ? profile.verificationStatus : 'PENDING',
      data: enriched
    });
  },

  // GET /api/collector/pickups/:id
  async getPickupDetails(req, res) {
    const { id } = req.params;
    const pickup = db.findPickupRequestById(id);

    if (!pickup) {
      return res.status(404).json({ success: false, error: `Pickup request #${id} not found.` });
    }

    if (pickup.collectorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to access details of an unassigned pickup request.'
      });
    }

    const citizen = db.findUserById(pickup.citizenId);
    const history = db.getStatusHistoryByPickupId(id);

    return res.status(200).json({
      success: true,
      data: {
        ...pickup,
        citizenName: citizen ? citizen.name : 'Citizen Partner',
        citizenPhone: citizen ? citizen.phone : 'Contact unavailable',
        statusHistory: history
      }
    });
  },

  // POST /api/collector/pickups/:id/accept
  async acceptPickup(req, res) {
    const { id } = req.params;
    const pickup = db.findPickupRequestById(id);

    if (!pickup) {
      return res.status(404).json({ success: false, error: `Pickup request #${id} not found.` });
    }

    const profile = db.findCollectorProfileByUserId(req.user.id);
    if (!profile || profile.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Collector account must be verified by an administrator before accepting pickup routes.'
      });
    }

    if (pickup.collectorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: This pickup request is not assigned to your collector account.'
      });
    }

    if (!isValidStatusTransition(pickup.currentStatus, 'ACCEPTED')) {
      return res.status(400).json({
        success: false,
        error: `Cannot accept pickup in status '${pickup.currentStatus}'. Must be in 'ASSIGNED' state.`
      });
    }

    const updated = db.updatePickupStatus(id, 'ACCEPTED', req.user.id, 'Collector accepted route dispatch');

    return res.status(200).json({
      success: true,
      message: `Pickup #${id} accepted. Route active.`,
      data: updated
    });
  },

  // PATCH /api/collector/pickups/:id/status
  async updatePickupStatus(req, res) {
    const { id } = req.params;
    const { status: newStatus, reason } = req.body;
    const pickup = db.findPickupRequestById(id);

    if (!pickup) {
      return res.status(404).json({ success: false, error: `Pickup request #${id} not found.` });
    }

    const profile = db.findCollectorProfileByUserId(req.user.id);
    if (!profile || profile.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Collector account must be verified by an administrator before updating pickup statuses.'
      });
    }

    if (pickup.collectorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to update this pickup request.'
      });
    }

    // Validate transition
    if (!isValidStatusTransition(pickup.currentStatus, newStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status transition from '${pickup.currentStatus}' to '${newStatus}'.`
      });
    }

    const defaultReasons = {
      COLLECTED: 'Doorstep handoff verified with citizen OTP and tamper seal attached',
      DELIVERED_TO_RECYCLER: 'Delivered to certified R2v3 Smelter Vault',
      COMPLETED: 'Weight recorded, scrap catalogued, recycling completed',
      FAILED: reason || 'Collection attempt failed at doorstep'
    };

    const logReason = reason || defaultReasons[newStatus] || `Status updated to ${newStatus}`;
    const updated = db.updatePickupStatus(id, newStatus, req.user.id, logReason);

    return res.status(200).json({
      success: true,
      message: `Pickup status updated to '${newStatus}'.`,
      data: updated
    });
  },

  // GET /api/collector/history
  async getCollectionHistory(req, res) {
    const all = db.getAllPickupRequests({
      collectorId: req.user.id
    });

    const completed = all.filter(p => p.currentStatus === 'COMPLETED' || p.currentStatus === 'DELIVERED_TO_RECYCLER');

    // Aggregate stats
    let totalWeightCollected = 0;
    const enrichedCompleted = completed.map(p => {
      const citizen = db.findUserById(p.citizenId);
      (p.items || []).forEach(item => {
        totalWeightCollected += (item.estimatedWeight || 0.5) * (item.quantity || 1);
      });
      return {
        ...p,
        citizenName: citizen ? citizen.name : 'Citizen Partner'
      };
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalAssigned: all.length,
        totalCompleted: completed.length,
        totalEstimatedWeightKg: Math.round(totalWeightCollected * 10) / 10
      },
      data: enrichedCompleted
    });
  },

  // GET /api/collector/verification-status
  async getVerificationStatus(req, res) {
    const profile = db.findCollectorProfileByUserId(req.user.id);
    return res.status(200).json({
      success: true,
      data: profile || {
        userId: req.user.id,
        verificationStatus: 'PENDING',
        businessName: req.user.name,
        serviceAreas: []
      }
    });
  }
};

module.exports = collectorController;
