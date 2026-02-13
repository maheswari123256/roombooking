const express = require("express");
const router = express.Router();
const Booking = require("../model/Booking");
const House = require("../model/House");
const { authMiddleware } = require("../middleware/auth");

// GET host dashboard stats
router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const hostId = req.user._id;

    // Find all houses of this host
    const houseIds = await House.find({ hostId }).distinct("_id");

    // Total Bookings
    const totalBookings = await Booking.countDocuments({ houseId: { $in: houseIds } });

    // Pending Requests
    const pendingRequests = await Booking.countDocuments({
      houseId: { $in: houseIds },
      bookingStatus: "Pending",
    });

    // Total Earnings (only Completed bookings)
    const earningsAgg = await Booking.aggregate([
      { $match: { houseId: { $in: houseIds }, bookingStatus: "Completed" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalEarnings = earningsAgg[0]?.total || 0;

    res.json({ totalBookings, pendingRequests, totalEarnings });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
