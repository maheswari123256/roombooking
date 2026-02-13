const express = require("express");
const router = express.Router();
const User = require("../model/User");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    console.log("📩 Forgot password request for:", email);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // ✅ STABLE TRANSPORTER
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // ✅ VERIFY PROPERLY
    await transporter.verify();
    console.log("✅ Email transporter ready");

    // ✅ CORRECT FRONTEND URL
    const resetURL = `http://localhost:5173/reset-password/${resetToken}`;

    // Send email
    await transporter.sendMail({
      from: `"Airbnb Clone" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset",
      html: `
        <p>You requested a password reset</p>
        <p>
          Click this link to reset your password:<br/>
          <a href="${resetURL}">${resetURL}</a>
        </p>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    res.json({ message: "Password reset link sent to your email." });

  } catch (err) {
    console.error("❌ Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
