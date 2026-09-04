const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Otp = require("../models/Otp");

const OTP_TTL_MINUTES = 10;

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

async function createOtp(userId, type) {
  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  await Otp.create({
    user_id: userId,
    code_hash: codeHash,
    type,
    expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });
  return code;
}

async function verifyOtp(userId, type, code) {
  const otp = await Otp.findOne({
    where: { user_id: userId, type, used_at: null },
    order: [["createdAt", "DESC"]],
  });
  if (!otp) return false;
  if (new Date(otp.expires_at) < new Date()) return false;
  const matches = await bcrypt.compare(code, otp.code_hash);
  if (!matches) return false;
  await otp.update({ used_at: new Date() });
  return true;
}

module.exports = { createOtp, verifyOtp, OTP_TTL_MINUTES };
