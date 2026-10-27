const db = require('../services/dbStore');

/**
 * Public Data Controller (Unauthenticated access)
 */
const publicController = {
  // GET /api/categories
  async getCategories(req, res) {
    const categories = db.getAllWasteCategories();
    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  },

  // GET /api/collection-centres
  async getCollectionCentres(req, res) {
    const centres = db.getAllCollectionCentres();
    return res.status(200).json({
      success: true,
      count: centres.length,
      data: centres
    });
  }
};

module.exports = publicController;
