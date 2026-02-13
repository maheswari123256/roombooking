const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const Razorpay = require("razorpay");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");


// Load environment variables
dotenv.config();
connectDB();

// Create express app
const app = express();

// Create HTTP server (for socket.io)
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // later restrict to frontend URL
    methods: ["GET", "POST"],
  },
});

// =====================
// Middleware
// =====================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// =====================
// 🔥 Firebase Service Worker (FCM FIX)
// =====================
app.get("/firebase-messaging-sw.js", (req, res) => {
  res.sendFile(path.join(__dirname, "firebase-messaging-sw.js"));
});


// =====================
// Razorpay setup (optional)
// =====================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "your_key_id",
  key_secret: process.env.RAZORPAY_SECRET || "your_key_secret",
});

// =====================
// Routes
// =====================
const userRoutes = require("./routes/userRoutes");
const houseRoutes = require("./routes/house");
const bookingRoutes = require("./routes/bookingRoute");
const amenity = require("./routes/amenity");
const reviewRoutes = require("./routes/review");
const hostStatsRoutes = require("./routes/hostStats");
const adminRoutes = require("./routes/admin");
const forgetRoutes = require("./routes/forget");
const adminHouseTypeRoutes = require("./routes/adminHouseType");
const authRoutes = require("./routes/auth");
const destinationRoutes = require("./routes/destination");


app.use("/api/auth", userRoutes);
app.use("/api/house", houseRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/amenities", amenity);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/forget", forgetRoutes);
app.use("/api/hostStats", hostStatsRoutes);
app.use("/api/admin/house-types", adminHouseTypeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/destinations", destinationRoutes);


// =====================
// Root routes
// =====================
app.get("/", (req, res) => {
  res.send("🎉 API is running with Socket.io!");
});

app.get("/reset-password/:token", (req, res) => {
  res.sendFile(path.join(__dirname, "public/reset-password.html"));
});

// =====================
// Socket.io Handlers
// =====================
let users = {}; // Store online users

io.on("connection", (socket) => {
  console.log("🔗 New client connected:", socket.id);

  // Register user with userId
  socket.on("register", (userId) => {
    users[userId] = socket.id;
    console.log(`✅ User ${userId} registered with socket ${socket.id}`);
  });

  // Send notification
  socket.on("sendNotification", ({ toUserId, message }) => {
    const receiverSocketId = users[toUserId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("notification", {
        from: socket.id,
        message,
      });
      console.log(`📩 Notification sent to ${toUserId}: ${message}`);
    } else {
      console.log(`❌ User ${toUserId} not connected`);
    }
  });

  // Broadcast message
  socket.on("broadcast", (msg) => {
    io.emit("notification", { from: "Server", message: msg });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
    for (let userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        console.log(`🗑️ Removed user ${userId}`);
      }
    }
  });
});

// =====================
// Start Server
// =====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
