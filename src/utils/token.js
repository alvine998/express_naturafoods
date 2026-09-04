const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const TokenBlacklist = require("../models/TokenBlacklist");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
const ACCESS_EXPIRES_IN_SEC = 3600; // contract: 1h

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN, jwtid: crypto.randomUUID() }
  );
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, username: user.username, role: user.role || "admin" },
    JWT_SECRET,
    { expiresIn: `${ACCESS_EXPIRES_IN_SEC}s`, jwtid: crypto.randomUUID() }
  );
}

function signRefreshToken(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { id: user.id, purpose: "refresh" },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN, jwtid: jti }
  );
  return { token, jti };
}

async function verifyToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  const blacklisted = await TokenBlacklist.findOne({ where: { jti: decoded.jti } });
  if (blacklisted) throw new Error("Token revoked");
  // also check RefreshToken revocation if it's a refresh token
  if (decoded.purpose === "refresh") {
    try {
      const RefreshToken = require("../models/RefreshToken");
      const rt = await RefreshToken.findOne({ where: { jti: decoded.jti } });
      if (rt && rt.revoked_at) throw new Error("Refresh token revoked");
    } catch (e) {
      if (e.message === "Refresh token revoked") throw e;
      // ignore model not yet synced errors
    }
  }
  return decoded;
}

module.exports = { signToken, signAccessToken, signRefreshToken, verifyToken, ACCESS_EXPIRES_IN_SEC, JWT_REFRESH_EXPIRES_IN };
