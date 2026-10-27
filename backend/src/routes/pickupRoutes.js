const express = require('express');
const router = express.Router();

const pickupController = require('../controllers/pickupController');
const authenticateUser = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createPickupSchema } = require('../validators/pickupValidator');

router.use(authenticateUser);

// Create new pickup request
router.post('/', validate(createPickupSchema), pickupController.createPickup);

// Retrieve user's requests
router.get('/', pickupController.getMyPickups);
router.get('/my-pickups', pickupController.getMyPickups);

// Retrieve request details
router.get('/:id', pickupController.getPickupById);

// Cancel eligible pickup
router.post('/:id/cancel', pickupController.cancelPickup);
router.patch('/:id/cancel', pickupController.cancelPickup);

// View status history
router.get('/:id/history', pickupController.getPickupHistory);

module.exports = router;
