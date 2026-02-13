const mongoose = require('mongoose');

// Schema for grouped images
const imageGroupSchema = new mongoose.Schema({
  type: {
    type: String, // Example: 'interior', 'exterior'
    required: true
  },
  urls: {
    type: [String], // Array of image URLs
    required: true
  }
});

// Main property schema
const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: String,
    location: {
      type: String,
      required: true
    },
     // ✅ HouseType reference
    houseType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HouseType",
      required: true
    },


    // ✅ Pricing
    pricePerNight: {
      type: Number,
      required: true
    },

    // ✅ Guest capacity
    guestCapacity: {
      adults: { type: Number, default: 1 },
      children: { type: Number, default: 0 },
      infants: { type: Number, default: 0 },
      pets: { type: Number, default: 0 },
      maxGuests: { type: Number, required: true }
    },

    // Grouped images
    images: [imageGroupSchema],

    // Host reference
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Amenities reference
    amenities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Amenity"
      }
    ],

    // Ratings
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    ratingSum: { type: Number, default: 0 }, // ✅ added for efficiency

    // Availability
    availability: [
      {
        from: { type: Date, required: true },
        to: { type: Date, required: true }
      }
    ]
  },
  { timestamps: true }
);

// ✅ Auto-update ratingAvg whenever ratingSum/ratingCount changes
propertySchema.methods.updateRating = function (newRating) {
  this.ratingSum += newRating;
  this.ratingCount += 1;
  this.ratingAvg = this.ratingSum / this.ratingCount;
  return this.save();
};

module.exports = mongoose.model("House", propertySchema);