const User = require('../model/User');
const Property = require('../model/House');
const Booking = require('../model/Booking');
const Amenity = require('../model/Amenity');
const Review = require('../model/Review');
const HouseType = require("../model/HouseType");
// ---------------- USERS ----------------

// View all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users", error: err.message });
  }
};

// Delete a user (+ optional cascade cleanup)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndDelete(userId);

    // Optional: delete related bookings & reviews
    await Booking.deleteMany({ userId });
    await Review.deleteMany({ userId });

    res.json({ message: '✅ User deleted (with related bookings & reviews)' });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user", error: err.message });
  }
};

// ---------------- PROPERTIES ----------------

// View all properties
const getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find()
      .populate('hostId', 'name email')
      .populate('amenities');
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: "Error fetching properties", error: err.message });
  }
};

// Delete a property (+ cascade cleanup)
const deleteProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    await Property.findByIdAndDelete(propertyId);

    // Cleanup related bookings & reviews
    await Booking.deleteMany({ houseId: propertyId });
    await Review.deleteMany({ houseId: propertyId });

    res.json({ message: '✅ Property deleted (with related bookings & reviews)' });
  } catch (err) {
    res.status(500).json({ message: "Error deleting property", error: err.message });
  }
};

// ---------------- BOOKINGS ----------------

// View all bookings
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'name email')
      .populate('houseId', 'title');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Error fetching bookings", error: err.message });
  }
};

// Delete a booking
const deleteBooking = async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: '✅ Booking deleted' });
  } catch (err) {
    res.status(500).json({ message: "Error deleting booking", error: err.message });
  }
};

// ---------------- REVIEWS ----------------


// Get all reviews (with house + user info)
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("userId", "name email")
      .populate("houseId", "title location");
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Error fetching reviews", error: err.message });
  }
};

// Delete review
const deleteReview = async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting review", error: err.message });
  }
};

// ---------------- AMENITIES ----------------

// Add amenity
const addAmenity = async (req, res) => {
  try {
    const amenity = new Amenity(req.body);
    await amenity.save();
    res.status(201).json(amenity);
  } catch (err) {
    res.status(500).json({ message: "Error adding amenity", error: err.message });
  }
};

// Update amenity
const updateAmenity = async (req, res) => {
  try {
    const updated = await Amenity.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error updating amenity", error: err.message });
  }
};

// Delete amenity
const deleteAmenity = async (req, res) => {
  try {
    await Amenity.findByIdAndDelete(req.params.id);
    res.json({ message: '✅ Amenity deleted' });
  } catch (err) {
    res.status(500).json({ message: "Error deleting amenity", error: err.message });
  }
};

// Get all amenities
const getAllAmenities = async (req, res) => {
  try {
    const amenities = await Amenity.find();
    res.json(amenities);
  } catch (err) {
    res.status(500).json({ message: "Error fetching amenities", error: err.message });
  }
};

// Add new house type
const addHouseType = async (req, res) => {
  try {
    const { name, icon } = req.body;
    const newType = new HouseType({ name, icon });
    await newType.save();
    res.status(201).json({ message: "House type added", data: newType });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all house types
const getAllHouseTypes = async (req, res) => {
  try {
    const types = await HouseType.find();
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update
const updateHouseType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon } = req.body;
    const updated = await HouseType.findByIdAndUpdate(
      id,
      { name, icon },
      { new: true }
    );
    res.json({ message: "Updated successfully", data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete
const deleteHouseType = async (req, res) => {
  try {
    const { id } = req.params;
    await HouseType.findByIdAndDelete(id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// ---------------- DASHBOARD STATS ----------------

const getDashboardStats = async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const propertyCount = await Property.countDocuments();
    const bookingCount = await Booking.countDocuments();
    const reviewCount = await Review.countDocuments();

    // breakdown bookings by status
    const bookingByStatus = await Booking.aggregate([
      { $group: { _id: "$bookingStatus", count: { $sum: 1 } } }
    ]);

    res.json({
      usersCount,
      propertyCount,
      bookingCount,
      reviewCount,
      bookingByStatus
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching dashboard stats", error: err.message });
  }
};


module.exports = {
  // Users
  getAllUsers,
  deleteUser,

  // Properties
  getAllProperties,
  deleteProperty,

  // Bookings
  getAllBookings,
  deleteBooking,

  // Reviews
  getAllReviews,
  deleteReview,

  // Amenities
  addAmenity,
  updateAmenity,
  deleteAmenity,
  getAllAmenities,

  // House Types (NEW)
  addHouseType,
  getAllHouseTypes,
  updateHouseType,
  deleteHouseType,
  // Dashboard
  getDashboardStats
};
