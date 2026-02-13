const express = require('express');
const router = express.Router();
const { authMiddleware, isAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// ---------------- HOUSE TYPES (Categories) ----------------
// Normal users + frontend GET (no auth)
router.get("/house-types", adminController.getAllHouseTypes);

// ---------------- AMENITIES ----------------
// Normal users + frontend GET (no auth)
router.get('/amenities', adminController.getAllAmenities);

// ---------------- Admin-only routes ----------------
router.use(authMiddleware, isAdmin);

router.get('/users', adminController.getAllUsers);
router.delete('/users/:id', adminController.deleteUser);

router.get('/properties', adminController.getAllProperties);
router.delete('/properties/:id', adminController.deleteProperty);

router.get('/booking', adminController.getAllBookings);
router.delete('/booking/:id', adminController.deleteBooking);

router.get("/reviews", adminController.getAllReviews);
router.delete("/reviews/:id", adminController.deleteReview);

router.get('/dashboard', adminController.getDashboardStats);

router.post('/amenities', adminController.addAmenity);
router.put('/amenities/:id', adminController.updateAmenity);
router.delete('/amenities/:id', adminController.deleteAmenity);

router.post("/house-types", adminController.addHouseType);
router.put("/house-types/:id", adminController.updateHouseType);
router.delete("/house-types/:id", adminController.deleteHouseType);

router.get("/dashboard/stats", adminController.getDashboardStats);

module.exports = router;
