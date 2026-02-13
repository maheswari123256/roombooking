const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  title: String,
  body: String,
  houseId: { type: mongoose.Schema.Types.ObjectId, ref: "House" },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // ✅ track users who saw it
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", notificationSchema);
