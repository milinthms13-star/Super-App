// Add this to backend/routes/sosRoutes.js
// const sosLocationUpgradeController = require('../controllers/sosLocationUpgradeController');

router.patch(
  '/incident/:incidentId/location',
  authMiddleware,
  sosLocationUpgradeController.updateLiveLocation
);
