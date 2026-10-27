const db = require('../services/dbStore');
const { isValidStatusTransition } = require('../validators/pickupValidator');

/**
 * Pickup Request Controller (Citizen & Shared)
 */
const pickupController = {
  // POST /api/pickups
  async createPickup(req, res) {
    const pickup = db.createPickupRequest(req.body, req.user.id);

    return res.status(201).json({
      success: true,
      message: 'Pickup request created successfully. Awaiting collector dispatch.',
      data: pickup
    });
  },

  // GET /api/pickups
  async getMyPickups(req, res) {
    // If Admin, can view all with optional status filter
    if (req.user.role === 'ADMIN') {
      const all = db.getAllPickupRequests({ status: req.query.status });
      return res.status(200).json({ success: true, count: all.length, data: all });
    }

    // Citizens only view their own requests
    const userPickups = db.getAllPickupRequests({ citizenId: req.user.id, status: req.query.status });

    let totalKg = 0;
    let completedCount = 0;
    userPickups.forEach(p => {
      if (p.currentStatus === 'COMPLETED' || p.currentStatus === 'DELIVERED_TO_RECYCLER') {
        completedCount++;
      }
      (p.items || []).forEach(item => {
        totalKg += (item.estimatedWeight || 0.5) * (item.quantity || 1);
      });
    });

    const summary = {
      totalRequests: userPickups.length,
      completedRequests: completedCount,
      activeRequests: userPickups.length - completedCount,
      totalKgDiverted: Math.round(totalKg * 10) / 10,
      carbonOffsetKg: Math.round(totalKg * 1.84 * 10) / 10
    };

    return res.status(200).json({
      success: true,
      count: userPickups.length,
      summary,
      data: userPickups
    });
  },

  // GET /api/pickups/:id
  async getPickupById(req, res) {
    const { id } = req.params;
    const pickup = db.findPickupRequestById(id);

    if (!pickup) {
      return res.status(404).json({ success: false, error: `Pickup request #${id} not found.` });
    }

    // Ownership Authorization Check:
    // Only the owner citizen, assigned collector, or an admin may view full details
    const isOwner = pickup.citizenId === req.user.id;
    const isAssignedCollector = pickup.collectorId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAssignedCollector && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to view this pickup request.'
      });
    }

    const history = db.getStatusHistoryByPickupId(id);

    return res.status(200).json({
      success: true,
      data: {
        ...pickup,
        statusHistory: history
      }
    });
  },

  // POST /api/pickups/:id/cancel
  async cancelPickup(req, res) {
    const { id } = req.params;
    const pickup = db.findPickupRequestById(id);

    if (!pickup) {
      return res.status(404).json({ success: false, error: `Pickup request #${id} not found.` });
    }

    // Authorization: only the owner citizen or an admin can cancel
    const isOwner = pickup.citizenId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only the booking citizen or administrator may cancel this pickup.'
      });
    }

    // Validate transition
    if (!isValidStatusTransition(pickup.currentStatus, 'CANCELLED')) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel pickup in current status '${pickup.currentStatus}'. Only PENDING, ASSIGNED, or ACCEPTED requests are eligible for cancellation.`
      });
    }

    const reason = req.body?.reason || 'Cancelled by citizen';
    const updated = db.updatePickupStatus(id, 'CANCELLED', req.user.id, reason);

    return res.status(200).json({
      success: true,
      message: `Pickup #${id} has been cancelled successfully.`,
      data: updated
    });
  },

  // GET /api/pickups/:id/history
  async getPickupHistory(req, res) {
    const { id } = req.params;
    const pickup = db.findPickupRequestById(id);

    if (!pickup) {
      return res.status(404).json({ success: false, error: `Pickup request #${id} not found.` });
    }

    // Authorization check
    const isOwner = pickup.citizenId === req.user.id;
    const isAssignedCollector = pickup.collectorId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAssignedCollector && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Access denied to pickup history.'
      });
    }

    const history = db.getStatusHistoryByPickupId(id);

    return res.status(200).json({
      success: true,
      data: history
    });
  }
};

module.exports = pickupController;
