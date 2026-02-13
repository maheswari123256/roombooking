const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  houseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "House",
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true
  },
 rating: { type: Number, min: 1, max: 5, required: true, validate: Number.isInteger },

  comment: {
    type: String,
    maxlength: 500
  }
}, { timestamps: true });

module.exports = mongoose.model("Review", reviewSchema);
