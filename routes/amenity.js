const express = require('express');
const router = express.Router();
const Amenity = require('../model/Amenity');
const { authMiddleware, isAdmin } = require('../middleware/auth');

// ✅ POST: Add new amenity (Admin only)
router.post('/add', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { type, iconUrl } = req.body;

    const newAmenity = new Amenity({ type, iconUrl });
    await newAmenity.save();

    res.status(201).json({ message: '✅ Amenity added', amenity: newAmenity });
  } catch (err) {
    res.status(400).json({ message: '❌ Failed to add amenity', error: err.message });
  }
});

// ✅ GET: All amenities (Public)
router.get('/', async (req, res) => {
  try {
    const amenities = await Amenity.find();
    res.status(200).json(amenities);
  } catch (err) {
    res.status(500).json({ message: '❌ Failed to fetch amenities', error: err.message });
  }
});

// ✅ PUT: Update amenity (Admin only)
router.put('/update/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { type, iconUrl } = req.body;

    const updatedAmenity = await Amenity.findByIdAndUpdate(
      req.params.id,
      { type, iconUrl },
      { new: true }
    );

    if (!updatedAmenity) {
      return res.status(404).json({ message: '❌ Amenity not found' });
    }

    res.status(200).json({ message: '✅ Amenity updated', amenity: updatedAmenity });
  } catch (err) {
    res.status(500).json({ message: '❌ Error updating amenity', error: err.message });
  }
});

// 🗑️ DELETE: Delete amenity (Admin only)
router.delete('/delete/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const amenity = await Amenity.findByIdAndDelete(req.params.id);

    if (!amenity) {
      return res.status(404).json({ message: '❌ Amenity not found' });
    }

    res.status(200).json({ message: '🗑️ Amenity deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: '❌ Error deleting amenity', error: err.message });
  }
});

module.exports = router;
