const mongoose = require("mongoose");

const houseTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  icon: {
    type: String, // frontend-ல் use செய்ய icon path / URL
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("HouseType", houseTypeSchema);

