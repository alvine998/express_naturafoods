const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const LoginAttempt = require("../models/LoginAttempt");
const TokenBlacklist = require("../models/TokenBlacklist");
const { createOtp, verifyOtp, OTP_TTL_MINUTES } = require("../utils/otp");
const { signToken } = require("../utils/token");
const { sendMail } = require("../utils/mailer");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

async function recordAttempt({ userId, email, status, failureReason, req }) {
  try {
    await LoginAttempt.create({
      user_id: userId,
      email,
      ip_address: req.ip,
      user_agent: (req.headers["user-agent"] || "").slice(0, 255),
      status,
      failure_reason: failureReason,
    });
  } catch (err) {
    console.error("Failed to record login attempt:", err.message);
  }
}

// POST /api/auth/login - verify password and send OTP to email
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      await recordAttempt({ email, status: "failed", failureReason: "User not found", req });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      await recordAttempt({ userId: user.id, email, status: "failed", failureReason: "Wrong password", req });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const code = await createOtp(user.id, "login");
    try {
      await sendMail(
        user.email,
        "Your NaturaFoods login code",
        `<p>Your login code is <b>${code}</b>. It expires in ${OTP_TTL_MINUTES} minutes.</p>`
      );
    } catch (err) {
      console.error("Failed to send OTP email:", err.message);
      return res.status(500).json({ message: "Failed to send OTP email, please try again" });
    }

    await recordAttempt({ userId: user.id, email, status: "success", req });
    res.json({ message: "OTP sent to email", user_id: user.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/verify_otp - verify OTP and issue JWT
router.post("/verify_otp", async (req, res) => {
  try {
    const { user_id, code } = req.body;
    if (!user_id || !code) {
      return res.status(400).json({ message: "user_id and code are required" });
    }

    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const ok = await verifyOtp(user.id, "login", code);
    if (!ok) return res.status(400).json({ message: "Invalid or expired OTP" });

    const token = signToken(user);
    res.json({ message: "Login successful", token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/resend_otp - send a new OTP
router.post("/resend_otp", async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ message: "user_id is required" });

    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const code = await createOtp(user.id, "login");
    try {
      await sendMail(
        user.email,
        "Your new NaturaFoods login code",
        `<p>Your new login code is <b>${code}</b>. It expires in ${OTP_TTL_MINUTES} minutes.</p>`
      );
    } catch (err) {
      console.error("Failed to send OTP email:", err.message);
      return res.status(500).json({ message: "Failed to send OTP email, please try again" });
    }

    res.json({ message: "New OTP sent to email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/logout - revoke the current token
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    const decoded = jwt.decode(req.headers.authorization.slice(7));
    if (decoded && decoded.jti) {
      await TokenBlacklist.create({
        jti: decoded.jti,
        expires_at: new Date(decoded.exp * 1000),
      });
    }
    res.json({ message: "Logged out" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/login_attempt - list login attempts (optional ?email= filter)
router.get("/login_attempt", async (req, res) => {
  try {
    const where = {};
    if (req.query.email) where.email = req.query.email;

    const attempts = await LoginAttempt.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot_password - verify email and send reset link with token
router.post("/forgot_password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = jwt.sign(
      { id: user.id, purpose: "password_reset" },
      JWT_SECRET,
      { expiresIn: "1h", jwtid: crypto.randomUUID() }
    );

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
    try {
      await sendMail(
        user.email,
        "Reset your NaturaFoods password",
        `<p>Click the link below to reset your password. It expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
      );
    } catch (err) {
      console.error("Failed to send reset email:", err.message);
      return res.status(500).json({ message: "Failed to send reset email, please try again" });
    }

    res.json({ message: "Password reset link sent to email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset_password - consume the reset token and set a new password
router.post("/reset_password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "token and password are required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({ message: "Invalid token purpose" });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = password;
    await user.save();

    res.json({ message: "Password updated, you can now log in" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
