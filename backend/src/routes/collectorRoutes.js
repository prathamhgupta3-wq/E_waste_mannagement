const express = require('express');
const router = express.Router();

const collectorController = require('../controllers/collectorController');
const authenticateUser = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const validate = require('../middleware/validate');
const { updateCollectorStatusSchema } = require('../validators/collectorValidator');

// Guard all collector routes: Must be authenticated and have role COLLECTOR
router.use(authenticateUser);
router.use(requireRole('COLLECTOR'));

// Verification status
router.get('/verification-status', collectorController.getVerificationStatus);

// View assigned pickups
router.get('/assigned', collectorController.getAssignedPickups);

// Review collection details
router.get('/pickups/:id', collectorController.getPickupDetails);

// Accept assigned pickup
router.post('/pickups/:id/accept', collectorController.acceptPickup);

// Update pickup status
router.patch('/pickups/:id/status', validate(updateCollectorStatusSchema), collectorController.updatePickupStatus);

// View collection history
router.get('/history', collectorController.getCollectionHistory);

module.exports = router;
