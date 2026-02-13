const express = require("express");
const router = express.Router();
const {
  getSuggestedDestinations
} = require("../controllers/destinationController");

router.get("/", getSuggestedDestinations);

module.exports = router;
