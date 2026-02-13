const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../model/Booking');
const House = require('../model/House'); 
const { authMiddleware, isAdmin } = require("../middleware/auth");
const cron = require("node-cron"); // 🔹 Added
const { sendNotification } = require("../utils/notifications");
const User = require("../model/User");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ 1. Create Booking and Razorpay Order
router.post("/booking", authMiddleware, async (req, res) => {
  try {
    const { houseId, checkIn, checkOut, guests } = req.body;

    // Validate house exists
    const house = await House.findById(houseId);
    if (!house) {
      return res.status(404).json({ message: "House not found" });
    }

    // Check house availability for overlapping bookings
    const overlappingBooking = await Booking.findOne({
      houseId,
      bookingStatus: { $in: ["Pending", "Confirmed"] },
      $or: [
        {
          checkIn: { $lt: new Date(checkOut) },
          checkOut: { $gt: new Date(checkIn) }
        }
      ]
    });

    if (overlappingBooking) {
      return res.status(400).json({ message: "❌ House not available for these dates" });
    }

    // Normalize guests object with defaults
    const normalizedGuests = {
      adults: typeof guests?.adults === 'number' ? guests.adults : 1,
      children: typeof guests?.children === 'number' ? guests.children : 0,
      infants: typeof guests?.infants === 'number' ? guests.infants : 0,
      pets: typeof guests?.pets === 'number' ? guests.pets : 0,
    };

    // Validate max per category
    if (normalizedGuests.adults > house.guestCapacity.adults) {
      return res.status(400).json({
        message: `❌ This house allows max ${house.guestCapacity.adults} adults. You requested ${normalizedGuests.adults}.`
      });
    }
    if (normalizedGuests.children > house.guestCapacity.children) {
      return res.status(400).json({
        message: `❌ This house allows max ${house.guestCapacity.children} children. You requested ${normalizedGuests.children}.`
      });
    }
    if (normalizedGuests.infants > house.guestCapacity.infants) {
      return res.status(400).json({
        message: `❌ This house allows max ${house.guestCapacity.infants} infants. You requested ${normalizedGuests.infants}.`
      });
    }
    if (normalizedGuests.pets > house.guestCapacity.pets) {
      return res.status(400).json({
        message: `❌ This house allows max ${house.guestCapacity.pets} pets. You requested ${normalizedGuests.pets}.`
      });
    }

    // Calculate total guests count
    const totalGuests = normalizedGuests.adults + normalizedGuests.children + normalizedGuests.infants + normalizedGuests.pets;

    // Validate max total guests
    const maxTotalGuests = house.guestCapacity.maxGuests || 30; // fallback max
    if (totalGuests > maxTotalGuests) {
      return res.status(400).json({
        message: `❌ Maximum total guests allowed is ${maxTotalGuests}. You requested ${totalGuests}.`
      });
    }

    // Calculate nights
    const nights = Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    );

    // Calculate total amount - price per night × nights × totalGuests (adjust if needed)
    const totalAmount = house.pricePerNight * nights * totalGuests;

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: totalAmount * 100, // amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });

    // Create booking record with guests and total guests
    const booking = new Booking({
      userId: req.user._id,
      houseId,
      checkIn,
      checkOut,
      guests: normalizedGuests,
      totalGuests,
      paymentMode: "Razorpay",
      paymentStatus: "Pending",
      totalAmount,
      bookingStatus: "Pending",
      razorpayOrderId: order.id
    });

    await booking.save();

    res.status(200).json({
      message: "✅ Booking initiated",
      orderId: order.id,
      amount: order.amount,
      bookingId: booking._id
    });

  } catch (err) {
    console.error("❌ Booking Error:", err.message);
    res.status(400).json({ message: "❌ Booking failed", error: err.message });
  }
});


// ✅ 2. Verify Razorpay Payment
router.post("/verify", authMiddleware, async (req, res) => {
  try {
    const { bookingId, razorpayPaymentId, razorpaySignature } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "❌ Booking not found" });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${booking.razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ message: "❌ Invalid payment signature" });
    }

    // Update Booking
   if (generatedSignature === razorpaySignature) {
  booking.paymentStatus = "Paid";
  booking.bookingStatus = "Confirmed";
  await booking.save();

  // ✅ notification trigger
  const user = await User.findById(booking.userId);
  if (user?.fcmToken) {
    await sendNotification(user.fcmToken, "Booking Confirmed", "உங்க booking வெற்றிகரமாக complete ஆயிடுச்சு!");
  }

  res.json({ message: "✅ Payment verified & booking confirmed" });
}

  } catch (err) {
    console.error("❌ Verification Error:", err.message);
    res.status(500).json({ message: "❌ Payment verification error", error: err.message });
  }
});
router.post("/booking-confirmed/:bookingId", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate("userId");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
const token = booking.userId.fcmToken;
if (token) {
  await sendNotification(token, "Booking Confirmed!", "Your booking has been confirmed.");
}
    res.json({ message: "Notification sent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error sending notification", error: err.message });
  }
});

// ✅ 3. Get All Bookings for Logged-In User
router.get("/mybookings", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id }).populate("houseId");
    res.status(200).json(bookings);
  } catch (err) {
    res.status(400).json({ message: "❌ Failed to fetch bookings" });
  }
});

// ✅ 4. (Optional) Get a Single Booking by ID
router.get("/booking/:id", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("houseId");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.status(200).json(booking);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ Admin: Get All Bookings
router.get('/:id', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'email')
      .populate('houseId', 'title');
    res.json(bookings.map(b => ({
      _id: b._id,
      user: b.userId,
      property: b.houseId,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel booking
router.delete('/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.json({ message: "Booking cancelled successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Cron Job: Auto-update Completed Bookings
cron.schedule("0 0 * * *", async () => {
  try {
    const now = new Date();
    const result = await Booking.updateMany(
      { bookingStatus: "Confirmed", checkOut: { $lt: now } },
      { $set: { bookingStatus: "Completed" } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ ${result.modifiedCount} bookings updated to Completed`);
    }
  } catch (err) {
    console.error("❌ Cron Job Error:", err.message);
  }
});
router.get("/checkout-status/:bookingId", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    res.json({
      bookingId: booking._id,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


module.exports = router;
