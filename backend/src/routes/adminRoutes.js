const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const authenticateUser = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const validate = require('../middleware/validate');
const {
  assignCollectorSchema,
  verifyCollectorSchema,
  createCollectionCentreSchema
} = require('../validators/adminValidator');
const { provisionAdminSchema } = require('../validators/authValidator');

// Guard all admin routes: Must be authenticated and have role ADMIN
router.use(authenticateUser);
router.use(requireRole('ADMIN'));

// Secure Admin Provisioning: Only verified ADMIN can provision new administrators
router.post('/provision-admin', validate(provisionAdminSchema), authController.provisionAdmin);

// User Management (searchable, filterable by role, paginated)
router.get('/users', adminController.listUsers);

// List pickup requests (searchable, filterable by status/pincode, paginated)
router.get('/pickups', adminController.listPickups);
router.delete('/pickups/:id', adminController.preventPickupDeletion);

// Audit Trail (statutory chain-of-custody logging)
router.get('/audit-trail', adminController.getAuditTrail);

// List collectors (for assignment and verification management)
router.get('/collectors', adminController.listCollectors);

// Assign collectors to pickups
router.post('/pickups/:id/assign', validate(assignCollectorSchema), adminController.assignCollector);

// Verify collector accounts
router.patch('/collectors/:id/verify', validate(verifyCollectorSchema), adminController.verifyCollector);

// Collection Centre Management
router.get('/collection-centres', adminController.listCollectionCentres);
router.post('/collection-centres', validate(createCollectionCentreSchema), adminController.addCollectionCentre);
router.patch('/collection-centres/:id', adminController.updateCollectionCentre);

// Platform Statistics
router.get('/statistics', adminController.getStatistics);

module.exports = router;
