const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const HouseType = require("../model/HouseType");

// ------------------ GET all house types ------------------
router.get("/", authMiddleware, async (req, res) => {
  try {
    const types = await HouseType.find();
    res.json(types);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ------------------ POST add house type ------------------
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name || !icon) {
      return res.status(400).json({ error: "Name and Icon are required" });
    }

    const newType = new HouseType({ name, icon });
    await newType.save();
    res.json(newType);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ------------------ PUT update ------------------
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name || !icon) {
      return res.status(400).json({ error: "Name and Icon are required" });
    }

    const type = await HouseType.findByIdAndUpdate(
      req.params.id,
      { name, icon },
      { new: true }
    );
    if (!type) return res.status(404).json({ error: "House type not found" });

    res.json(type);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ------------------ DELETE ------------------
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await HouseType.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "House type not found" });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
