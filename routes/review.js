const express = require("express");
const router = express.Router();
const Review = require("../model/Review");
const Booking = require("../model/Booking");
const House = require("../model/House");
const { authMiddleware } = require("../middleware/auth");

// ✅ Add a Review (only if booking completed)
router.post("/:bookingId", authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ message: "❌ Booking not found" });
    }

    // ✅ Check if booking belongs to user
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "❌ Not your booking" });
    }

    // ✅ Auto update booking status if checkout is over
    const now = new Date();
    if (booking.bookingStatus === "Confirmed" && now > new Date(booking.checkOut)) {
      booking.bookingStatus = "Completed";
      await booking.save();
    }

    // ✅ Check if stay is completed
    if (booking.bookingStatus !== "Completed") {
      return res.status(400).json({ message: "❌ You can review only after stay is completed" });
    }

    // ✅ Prevent duplicate reviews
    const existingReview = await Review.findOne({ bookingId: booking._id });
    if (existingReview) {
      return res.status(400).json({ message: "❌ Review already submitted" });
    }

    // ✅ Save review
    const review = new Review({
      userId: req.user._id,
      houseId: booking.houseId,
      bookingId: booking._id,
      rating,
      comment
    });

    await review.save();

    // ✅ Update house ratings
    await House.findByIdAndUpdate(
      booking.houseId,
      { $inc: { ratingCount: 1, ratingSum: rating } },
      { new: true }
    );

    // Optionally recalc average if you don’t keep `ratingSum`
    const agg = await Review.aggregate([
      { $match: { houseId: booking.houseId } },
      { $group: { _id: "$houseId", count: { $sum: 1 }, avg: { $avg: "$rating" } } }
    ]);

    if (agg[0]) {
      await House.findByIdAndUpdate(booking.houseId, {
        ratingCount: agg[0].count,
        ratingAvg: Number(agg[0].avg.toFixed(1))
      });
    }

    res.status(200).json({ message: "✅ Review submitted", review });
  } catch (err) {
    res.status(500).json({ message: "❌ Error submitting review", error: err.message });
  }
});

// ✅ Get all reviews for a property
router.get("/house/:houseId", async (req, res) => {
  try {
    const reviews = await Review.find({ houseId: req.params.houseId })
      .populate("userId", "name email");

    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : 0;

    res.status(200).json({ reviews, avgRating });
  } catch (err) {
    res.status(500).json({ message: "❌ Error fetching reviews", error: err.message });
  }
});

// ✅ Check if current user can review this house
// ✅ Check if current user can review this house
router.get("/eligible/:houseId", authMiddleware, async (req, res) => {
  const { houseId } = req.params;

  let booking = await Booking.findOne({
    userId: req.user._id,
    houseId
  }).sort({ checkOut: -1 });

  if (!booking) return res.json({ eligible: false });

  // 🔹 Auto-update status if stay completed
  const now = new Date();
  if (booking.bookingStatus === "Confirmed" && now > new Date(booking.checkOut)) {
    booking.bookingStatus = "Completed";
    await booking.save();
  }

  if (booking.bookingStatus !== "Completed") {
    return res.json({ eligible: false });
  }

  // 🔹 Prevent duplicate reviews
  const existing = await Review.findOne({ bookingId: booking._id });
  if (existing) return res.json({ eligible: false });

  return res.json({ eligible: true, bookingId: booking._id });
});


module.exports = router;
