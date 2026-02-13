const express = require("express");


const User = require("../model/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const { authMiddleware } = require("../middleware/auth");
const { sendNotification } = require("../utils/firebaseAdmin");
const Notification = require("../model/Notification");

const JWT_SECRET = process.env.JWT_SECRET;

// ================= REGISTER =============
const register=async(req,res)=>{
  try {
    const { name, email, password, fcmToken } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      fcmTokens: fcmToken ? [fcmToken] : []
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1d" });

    if (fcmToken) {
      await sendNotification(user.fcmTokens, "Welcome 🎉", `Thanks for signing up, ${name}!`);
    }

    res.json({ msg: "User registered successfully", token, user });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// ================= LOGIN =================
const login=async(req,res)=>{
  try {
    const { email, password, fcmToken } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    if (fcmToken && !user.fcmTokens.includes(fcmToken)) {
      user.fcmTokens.push(fcmToken);
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1d" });

    if (user.fcmTokens.length > 0) {
      await sendNotification(user.fcmTokens, "Login Alert", "You logged in successfully!");
    }

    const notifications = await Notification.find({
      userId: user._id,
      isRead: false
    }).sort({ createdAt: -1 });

    res.json({
      msg: "Login successful",
      token,
      user,
      notifications
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// ================= SAVE FCM =================
const saveFcmToken=async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ message: "FCM token required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.fcmTokens.includes(fcmToken)) {
      user.fcmTokens.push(fcmToken);
      await user.save();
    }

    res.json({ message: "FCM token saved successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error saving token", error: err.message });
  }
};

module.exports = {register,login,saveFcmToken}; // ✅ controller itself exports router
