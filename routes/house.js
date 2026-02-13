const express = require('express');
const router = express.Router();
const Booking = require('../model/Booking');
const House = require("../model/House");
const Amenity = require("../model/Amenity");
const User = require("../model/User");
const { authMiddleware } = require("../middleware/auth");
const upload = require("../middleware/uploadMiddleware");

const { sendNotification } = require('../utils/firebaseAdmin'); // FCM notifications

// ------------------- ADD PROPERTY -------------------
router.post("/add", authMiddleware, upload.fields([
  { name: 'interior', maxCount: 10 },
  { name: 'exterior', maxCount: 10 },
]), async (req, res) => {
  try {
    const { title, description, location, houseType,price, maxGuests, adults, children, infants, pets } = req.body;
    let amenities = req.body.amenities;
    if (typeof amenities === "string") amenities = JSON.parse(amenities);

    // Group images by type
    const imageGroups = [];
    for (let type in req.files) {
      const urls = req.files[type].map(file => `/uploads/${file.filename}`);
      imageGroups.push({ type, urls });
    }

    // Availability: 30 days from today
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);
    const availability = [{ from: today, to: thirtyDaysLater }];

    // Guest capacity
    const adultsNum = adults ? parseInt(adults) : 0;
    const childrenNum = children ? parseInt(children) : 0;
    const infantsNum = infants ? parseInt(infants) : 0;
    const petsNum = pets ? parseInt(pets) : 0;
    const maxGuestsCalc = maxGuests ? parseInt(maxGuests) : (adultsNum + childrenNum + infantsNum + petsNum);

    const property = new House({
      title,
      description,
      location,
      houseType, 
      pricePerNight: parseFloat(price),
      guestCapacity: { adults: adultsNum, children: childrenNum, infants: infantsNum, pets: petsNum, maxGuests: maxGuestsCalc },
      images: imageGroups,
      hostId: req.user._id,
      amenities,
      availability
    });

    await property.save();

      const users = await User.find({ fcmTokens: { $exists: true, $ne: [] } });
    const tokens = users.flatMap((u) => u.fcmTokens);

    // 🔹 Send notification to all users
    if (tokens.length > 0) {
      await sendNotification(tokens, "🏡 New Property Added", `${title} is now available!`);
    }

    res.status(200).json({ message: "✅ Property added and notifications sent", property });

  } catch (err) {
    console.error("🔥 Add Property Error:", err.message);
    res.status(400).json({ message: "❌ Error occurred while adding property", error: err.message });
  }
});

// ------------------- UPDATE PROPERTY -------------------
router.put("/update/:id", authMiddleware, upload.fields([
  { name: "interior", maxCount: 10 },
  { name: "exterior", maxCount: 10 }
]), async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ message: "❌ Property not found" });

    // Only host can update
    if (house.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "❌ Not authorized to update this property" });
    }

    const { title, description, location, price, maxGuests, adults, children, infants, pets } = req.body;

    // Amenities
    let amenities = req.body.amenities;
    if (typeof amenities === "string") {
      try { amenities = JSON.parse(amenities); } catch { amenities = [amenities]; }
    }

    // Images
    let imageGroups = [...house.images];
    if (req.files["interior"]) {
      const urls = req.files["interior"].map(f => `/uploads/${f.filename}`);
      imageGroups = imageGroups.filter(img => img.type !== "interior");
      imageGroups.push({ type: "interior", urls });
    }
    if (req.files["exterior"]) {
      const urls = req.files["exterior"].map(f => `/uploads/${f.filename}`);
      imageGroups = imageGroups.filter(img => img.type !== "exterior");
      imageGroups.push({ type: "exterior", urls });
    }

    // Update object
    const updateData = {
      title: title ?? house.title,
      description: description ?? house.description,
      location: location ?? house.location,
      pricePerNight: price !== undefined && price !== "" ? parseFloat(price) : house.pricePerNight,
      guestCapacity: {
        adults: adults !== undefined ? parseInt(adults) : house.guestCapacity.adults,
        children: children !== undefined ? parseInt(children) : house.guestCapacity.children,
        infants: infants !== undefined ? parseInt(infants) : house.guestCapacity.infants,
        pets: pets !== undefined ? parseInt(pets) : house.guestCapacity.pets,
        maxGuests: maxGuests !== undefined ? parseInt(maxGuests) : house.guestCapacity.maxGuests
      },
      images: imageGroups,
      amenities: amenities || house.amenities
    };

    const updatedHouse = await House.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true })
      .populate("amenities", "_id name iconUrl");

    res.status(200).json({ message: "✅ Property updated", data: updatedHouse });

  } catch (err) {
    console.error("🔥 Update Error:", err);
    res.status(500).json({ message: "❌ Error updating property", error: err.message });
  }
});

// ------------------- DELETE PROPERTY -------------------
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ message: "❌ Property not found" });

    if (house.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "❌ Not authorized to delete this property" });
    }

    await House.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "🗑️ Property deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "❌ Error deleting property", error: err.message });
  }
});

// ------------------- GET USER'S PROPERTIES -------------------
router.get("/my-properties", authMiddleware, async (req, res) => {
  try {
    const myProperties = await House.find({ hostId: req.user._id })
      .populate('amenities', '_id type iconUrl');
    res.status(200).json(myProperties);
  } catch (err) {
    res.status(500).json({ message: "❌ Error fetching your properties", error: err.message });
  }
});
// ------------------- GET HOUSES BY TYPE -------------------
// 🔹 Get houses by houseType
router.get("/by-type/:typeId", async (req, res) => {
  try {
    const { typeId } = req.params;

    let houses = await House.find({ houseType: typeId }).populate("houseType");

    // Remove duplicates by _id
    houses = houses.filter(
      (v, i, a) => a.findIndex(t => t._id.toString() === v._id.toString()) === i
    );

    res.json(houses);
  } catch (err) {
    console.error("Error fetching houses by type:", err);
    res.status(500).json({ message: "Server error fetching houses" });
  }
});
// ------------------- CHECK AVAILABILITY -------------------
router.get("/:id/check", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ message: "Missing from/to" });

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (toDate <= fromDate) return res.status(400).json({ message: "Invalid dates" });

    const house = await House.findById(req.params.id).lean();
    if (!house) return res.status(404).json({ message: "Property not found" });

    const inAnyWindow = (house.availability || []).some(win =>
      new Date(win.from) <= fromDate && new Date(win.to) >= toDate
    );
    if (!inAnyWindow) return res.json({ available: false, reason: "Outside availability window" });

    const overlapping = await Booking.findOne({
      houseId: req.params.id,
      bookingStatus: { $in: ["Pending", "Confirmed"] },
      checkIn: { $lt: toDate },
      checkOut: { $gt: fromDate }
    }).lean();

    return res.json({ available: !overlapping });
  } catch (err) {
    console.error("Availability check error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});
// ------------------- GET HOUSES BY LOCATION (Destination Click) -------------------
router.get("/by-location", async (req, res) => {
  try {
    const { location } = req.query;

    if (!location) {
      return res.status(400).json({ message: "Location is required" });
    }

    const houses = await House.find({
      location: { $regex: location, $options: "i" }
    })
      .populate("houseType", "name")
      .populate("amenities", "type iconUrl");

    res.status(200).json(houses);
  } catch (err) {
    console.error("🔥 Get houses by location error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// ------------------- GET SINGLE PROPERTY -------------------
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const house = await House.findById(req.params.id)
      .populate("amenities", "_id type iconUrl");
    if (!house) return res.status(404).json({ message: "❌ Property not found" });

    res.status(200).json(house);
  } catch (err) {
    console.error("🔥 Fetch Property Error:", err);
    res.status(500).json({ message: "❌ Error fetching property", error: err.message });
  }
});


// ------------------- GET ALL HOUSES -------------------
router.get("/", async (req, res) => {
  try {
    const houses = await House.find().populate('amenities', 'type iconUrl -_id');
    res.status(200).json(houses);
  } catch (err) {
    res.status(500).json({ message: "❌ Failed to fetch available houses", error: err.message });
  }
});

// ------------------- SEARCH HOUSES -------------------
router.get("/search", async (req, res) => {
  try {
    const { location, checkIn, checkOut, guests } = req.query;

    if (!location || !checkIn || !checkOut || !guests) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Step 1: Find houses that match location + guest capacity
    let houses = await House.find({
      location: { $regex: location, $options: "i" },
      "guestCapacity.maxGuests": { $gte: Number(guests) }
    }).lean();

    // Step 2: Filter out houses that are already booked
    const availableHouses = [];
    for (const house of houses) {
      const overlappingBooking = await Booking.findOne({
        houseId: house._id,
        bookingStatus: { $in: ["Pending", "Confirmed"] },
        checkIn: { $lt: checkOutDate },
        checkOut: { $gt: checkInDate }
      });

      if (!overlappingBooking) {
        availableHouses.push(house);
      }
    }

    res.json(availableHouses);
  } catch (err) {
    console.error("🔥 Search Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// Location suggestions
router.get("/suggest", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);

    const results = await House.find(
      { location: { $regex: q, $options: "i" } },
      { location: 1 }
    ).limit(8);

    const unique = [...new Set(results.map(r => r.location))];
    res.json(unique);
  } catch (err) {
    console.error("Suggest Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;
