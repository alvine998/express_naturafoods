const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const LoginAttempt = require("../models/LoginAttempt");
const TokenBlacklist = require("../models/TokenBlacklist");
const RefreshToken = require("../models/RefreshToken");
const { createOtp, verifyOtp, OTP_TTL_MINUTES } = require("../utils/otp");
const { signToken, signAccessToken, signRefreshToken, ACCESS_EXPIRES_IN_SEC } = require("../utils/token");
const { sendMail } = require("../utils/mailer");
const authMiddleware = require("../middleware/auth");
const { sendSuccess, sendError } = require("../utils/envelope");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

function isContractReq(req) {
  return (req.baseUrl && req.baseUrl.includes("/v1")) || (req.originalUrl && req.originalUrl.includes("/v1"));
}

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

async function issuePair(user) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, jti } = signRefreshToken(user);
  const hash = await bcrypt.hash(refreshToken, 10);
  // store refresh token
  try {
    await RefreshToken.create({
      user_id: user.id,
      jti,
      token_hash: hash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  } catch (e) {
    console.error("Failed to store refresh token:", e.message);
  }
  return { accessToken, refreshToken, expiresIn: ACCESS_EXPIRES_IN_SEC };
}

// POST /auth/login - Contract (v1) returns JWT pair, Legacy (/api) sends OTP
router.post("/login", async (req, res) => {
  const contract = isContractReq(req);
  try {
    // Contract mode: accept username OR email + password, return JWT pair
    if (contract) {
      const { username, email, password } = req.body;
      const loginId = username || email;
      if (!loginId || !password) {
        return sendError(res, { code: "VALIDATION_ERROR", message: "username/email and password are required", status: 422, details: { loginId: "required", password: "required" } });
      }
      // try username first, then email, then name
      let user = null;
      if (username) {
        user = await User.findOne({ where: { username: String(username).toLowerCase() } });
      }
      if (!user && email) {
        user = await User.findOne({ where: { email } });
      }
      if (!user && loginId) {
        // fallback: try both
        user = await User.findOne({ where: { username: String(loginId).toLowerCase() } });
        if (!user) user = await User.findOne({ where: { email: loginId } });
      }
      if (!user) {
        await recordAttempt({ email: loginId, status: "failed", failureReason: "User not found", req });
        return sendError(res, { code: "UNAUTHORIZED", message: "Invalid credentials.", status: 401 });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        await recordAttempt({ userId: user.id, email: user.email, status: "failed", failureReason: "Wrong password", req });
        return sendError(res, { code: "UNAUTHORIZED", message: "Invalid credentials.", status: 401 });
      }
      await recordAttempt({ userId: user.id, email: user.email, status: "success", req });
      const { accessToken, refreshToken, expiresIn } = await issuePair(user);
      return sendSuccess(res, {
        accessToken,
        refreshToken,
        expiresIn,
        user: { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role },
      });
    }

    // Legacy OTP mode (/api/auth/login)
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
    if (contract) return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
    res.status(500).json({ message: err.message });
  }
});

// POST /auth/refresh - contract only
router.post("/refresh", async (req, res) => {
  const contract = isContractReq(req);
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      if (contract) return sendError(res, { code: "VALIDATION_ERROR", message: "refreshToken is required", status: 422 });
      return res.status(400).json({ message: "refreshToken is required" });
    }
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (e) {
      if (contract) return sendError(res, { code: "UNAUTHORIZED", message: "Invalid or expired refresh token", status: 401 });
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }
    if (decoded.purpose !== "refresh") {
      if (contract) return sendError(res, { code: "UNAUTHORIZED", message: "Invalid token purpose", status: 401 });
      return res.status(401).json({ message: "Invalid token purpose" });
    }
    // check blacklist / revoked
    const blacklisted = await TokenBlacklist.findOne({ where: { jti: decoded.jti } });
    if (blacklisted) {
      if (contract) return sendError(res, { code: "UNAUTHORIZED", message: "Refresh token revoked", status: 401 });
      return res.status(401).json({ message: "Refresh token revoked" });
    }
    const rt = await RefreshToken.findOne({ where: { jti: decoded.jti } });
    if (rt && rt.revoked_at) {
      if (contract) return sendError(res, { code: "UNAUTHORIZED", message: "Refresh token revoked", status: 401 });
      return res.status(401).json({ message: "Refresh token revoked" });
    }
    // optionally verify hash matches? if we stored hash we could bcrypt compare, but JWT itself is verification
    const user = await User.findByPk(decoded.id);
    if (!user) {
      if (contract) return sendError(res, { code: "UNAUTHORIZED", message: "User not found", status: 401 });
      return res.status(401).json({ message: "User not found" });
    }
    const accessToken = signAccessToken(user);
    if (contract) return sendSuccess(res, { accessToken, expiresIn: ACCESS_EXPIRES_IN_SEC });
    return res.json({ accessToken, expiresIn: ACCESS_EXPIRES_IN_SEC });
  } catch (err) {
    if (contract) return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
    res.status(500).json({ message: err.message });
  }
});

// POST /auth/verify_otp - legacy
router.post("/verify_otp", async (req, res) => {
  const contract = isContractReq(req);
  try {
    const { user_id, code } = req.body;
    if (!user_id || !code) {
      if (contract) return sendError(res, { code: "VALIDATION_ERROR", message: "user_id and code are required", status: 422 });
      return res.status(400).json({ message: "user_id and code are required" });
    }
    const user = await User.findByPk(user_id);
    if (!user) {
      if (contract) return sendError(res, { code: "NOT_FOUND", message: "User not found", status: 404 });
      return res.status(404).json({ message: "User not found" });
    }
    const ok = await verifyOtp(user.id, "login", code);
    if (!ok) {
      if (contract) return sendError(res, { code: "UNAUTHORIZED", message: "Invalid or expired OTP", status: 400 });
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    const token = signToken(user);
    // For contract, also issue refresh
    if (contract) {
      const { accessToken, refreshToken, expiresIn } = await issuePair(user);
      return sendSuccess(res, { accessToken, refreshToken, expiresIn, user: { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role } });
    }
    res.json({ message: "Login successful", token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    if (contract) return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
    res.status(500).json({ message: err.message });
  }
});

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

// POST /auth/logout - contract invalidates refresh + access, legacy invalidates access
router.post("/logout", authMiddleware, async (req, res) => {
  const contract = isContractReq(req);
  try {
    const authHeader = req.headers.authorization || "";
    const accessJti = req.user?.jti;
    const accessExp = req.user?.exp;
    if (accessJti && accessExp) {
      await TokenBlacklist.findOrCreate({
        where: { jti: accessJti },
        defaults: { jti: accessJti, expires_at: new Date(accessExp * 1000) },
      });
    } else {
      const decoded = jwt.decode(authHeader.slice(7));
      if (decoded && decoded.jti) {
        await TokenBlacklist.findOrCreate({
          where: { jti: decoded.jti },
          defaults: { jti: decoded.jti, expires_at: new Date(decoded.exp * 1000) },
        });
      }
    }
    // contract: also revoke refresh token if provided
    if (contract && req.body.refreshToken) {
      try {
        const dec = jwt.decode(req.body.refreshToken);
        if (dec && dec.jti) {
          await TokenBlacklist.findOrCreate({
            where: { jti: dec.jti },
            defaults: { jti: dec.jti, expires_at: new Date(dec.exp * 1000) },
          });
          const rt = await RefreshToken.findOne({ where: { jti: dec.jti } });
          if (rt) await rt.update({ revoked_at: new Date() });
        }
      } catch { /* ignore */ }
    } else if (req.body.refreshToken) {
      try {
        const dec = jwt.decode(req.body.refreshToken);
        if (dec && dec.jti) {
          await RefreshToken.update({ revoked_at: new Date() }, { where: { jti: dec.jti } });
        }
      } catch { /* ignore */ }
    }
    if (contract) return sendSuccess(res, null, null, 200);
    res.json({ message: "Logged out" });
  } catch (err) {
    if (contract) return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
    res.status(500).json({ message: err.message });
  }
});

router.get("/login_attempt", async (req, res) => {
  try {
    const where = {};
    if (req.query.email) where.email = req.query.email;
    const attempts = await LoginAttempt.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
    if (isContractReq(req)) return sendSuccess(res, attempts);
    res.json(attempts);
  } catch (err) {
    if (isContractReq(req)) return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
    res.status(500).json({ message: err.message });
  }
});

router.post("/forgot_password", async (req, res) => {
  const contract = isContractReq(req);
  try {
    const { email } = req.body;
    if (!email) {
      if (contract) return sendError(res, { code: "VALIDATION_ERROR", message: "Email is required", status: 422 });
      return res.status(400).json({ message: "Email is required" });
    }
    const user = await User.findOne({ where: { email } });
    if (!user) {
      if (contract) return sendError(res, { code: "NOT_FOUND", message: "User not found", status: 404 });
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
      if (contract) return sendError(res, { code: "INTERNAL_ERROR", message: "Failed to send reset email, please try again", status: 500 });
      return res.status(500).json({ message: "Failed to send reset email, please try again" });
    }
    if (contract) return sendSuccess(res, { message: "Password reset link sent to email" });
    res.json({ message: "Password reset link sent to email" });
  } catch (err) {
    if (contract) return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
    res.status(500).json({ message: err.message });
  }
});

router.post("/reset_password", async (req, res) => {
  const contract = isContractReq(req);
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      if (contract) return sendError(res, { code: "VALIDATION_ERROR", message: "token and password are required", status: 422 });
      return res.status(400).json({ message: "token and password are required" });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (contract) return sendError(res, { code: "VALIDATION_ERROR", message: "Invalid or expired token", status: 400 });
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    if (decoded.purpose !== "password_reset") {
      if (contract) return sendError(res, { code: "VALIDATION_ERROR", message: "Invalid token purpose", status: 400 });
      return res.status(400).json({ message: "Invalid token purpose" });
    }
    const user = await User.findByPk(decoded.id);
    if (!user) {
      if (contract) return sendError(res, { code: "NOT_FOUND", message: "User not found", status: 404 });
      return res.status(404).json({ message: "User not found" });
    }
    user.password = password;
    await user.save();
    if (contract) return sendSuccess(res, { message: "Password updated, you can now log in" });
    res.json({ message: "Password updated, you can now log in" });
  } catch (err) {
    if (contract) return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
