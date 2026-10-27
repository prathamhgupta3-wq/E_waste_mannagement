const express = require('express');
const router = express.Router();

const publicController = require('../controllers/publicController');

router.get('/categories', publicController.getCategories);
router.get('/collection-centres', publicController.getCollectionCentres);

module.exports = router;
