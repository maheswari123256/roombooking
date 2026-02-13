const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  houseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "House"
  },
 checkIn: {
    type: Date,
    required: true,
  },
  checkOut: {
    type: Date,
    required: true,
  },
   guests: {
    adults: { type: Number, required: true, default: 1 },
    children: { type: Number, required: true, default: 0 },
    infants: { type: Number, required: true, default: 0 },
    pets: { type: Number, required: true, default: 0 },
  },
  // ✅ Payment related fields
  paymentMode: {
    type: String,
    enum: ["UPI", "CreditCard", "DebitCard", "Wallet", "Razorpay", "NetBanking", "Unknown"],
    default: "Unknown"
  },
  paymentStatus: {
    type: String,
    enum: ["Unpaid", "Paid", "Pending"],
    default: "Pending"
  },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,

  totalAmount: {
    type: Number,
    required: true
  },

  // ✅ Booking status
  bookingStatus: {
    type: String,
    enum: ["Pending", "Confirmed", "Cancelled", "Completed"],
    default: "Pending"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Booking", bookingSchema);
