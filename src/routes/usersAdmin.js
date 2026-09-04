const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta } = require("../utils/pagination");
const { validateUsername } = require("../utils/validators");
const { Op } = require("sequelize");

const router = express.Router();
router.use(authMiddleware);

function serialize(u) {
  const j = u.toJSON();
  return {
    id: j.id,
    username: j.username,
    email: j.email,
    name: j.name,
    role: j.role,
    createdAt: j.createdAt || j.created_at,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

// GET /admin/me - current user
router.get("/me", async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ["password"] } });
    if (!user) return sendError(res, { code: "NOT_FOUND", message: "User not found", status: 404 });
    return sendSuccess(res, serialize(user));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// GET /admin/users
router.get("/", async (req, res) => {
  try {
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = {};
    if (req.query.q) {
      const like = `%${req.query.q}%`;
      where[Op.or] = [
        { username: { [Op.like]: like } },
        { email: { [Op.like]: like } },
        { name: { [Op.like]: like } },
      ];
    }
    const { count, rows } = await User.findAndCountAll({
      where,
      order: sort,
      limit,
      offset,
      attributes: { exclude: ["password"] },
    });
    return sendSuccess(res, rows.map(serialize), buildMeta(page, limit, count));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// POST /admin/users
router.post("/", async (req, res) => {
  try {
    const { username, password, email, name, role } = req.body;
    if (!username) return sendError(res, { code: "VALIDATION_ERROR", message: "username is required", status: 422 });
    const errMsg = validateUsername(username);
    if (errMsg) return sendError(res, { code: "VALIDATION_ERROR", message: errMsg, status: 422 });
    if (!password) return sendError(res, { code: "VALIDATION_ERROR", message: "password is required", status: 422 });
    if (password.length < 6) return sendError(res, { code: "VALIDATION_ERROR", message: "password must be >=6 chars", status: 422 });
    const existing = await User.findOne({ where: { username: username.toLowerCase() } });
    if (existing) return sendError(res, { code: "CONFLICT", message: "Username already exists", status: 409 });
    const user = await User.create({
      username: username.toLowerCase(),
      password,
      email: email || `${username.toLowerCase()}@example.com`,
      name: name || username,
      role: role && ["admin", "super_admin"].includes(role) ? role : "admin",
    });
    const safe = await User.findByPk(user.id, { attributes: { exclude: ["password"] } });
    return sendSuccess(res, serialize(safe), null, 201);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return sendError(res, { code: "CONFLICT", message: "Username or email already exists", status: 409 });
    if (err.name === "SequelizeValidationError") return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// PUT /admin/users/:id - password change or role change
router.put("/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return sendError(res, { code: "NOT_FOUND", message: "User not found", status: 404 });
    const { password, role, username, email, name } = req.body;
    // Only self or super_admin can change password
    if (password !== undefined) {
      const isSelf = req.user.id === user.id;
      const isSuper = req.user.role === "super_admin";
      if (!isSelf && !isSuper) return sendError(res, { code: "FORBIDDEN", message: "Only self or super_admin can change password", status: 403 });
      user.password = password;
    }
    if (username !== undefined && username !== user.username) {
      const errMsg = validateUsername(username);
      if (errMsg) return sendError(res, { code: "VALIDATION_ERROR", message: errMsg, status: 422 });
      const exists = await User.findOne({ where: { username: username.toLowerCase() } });
      if (exists) return sendError(res, { code: "CONFLICT", message: "Username already exists", status: 409 });
      // only super_admin can change username? allow self? For now allow
      user.username = username.toLowerCase();
    }
    if (email !== undefined) user.email = email;
    if (name !== undefined) user.name = name;
    if (role !== undefined) {
      if (req.user.role !== "super_admin") return sendError(res, { code: "FORBIDDEN", message: "Only super_admin can change role", status: 403 });
      if (!["admin", "super_admin"].includes(role)) return sendError(res, { code: "VALIDATION_ERROR", message: "Invalid role", status: 422 });
      user.role = role;
    }
    await user.save();
    const safe = await User.findByPk(user.id, { attributes: { exclude: ["password"] } });
    return sendSuccess(res, serialize(safe));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return sendError(res, { code: "CONFLICT", message: "Username already exists", status: 409 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// DELETE /admin/users/:id
router.delete("/:id", async (req, res) => {
  try {
    if (req.user.id === req.params.id) return sendError(res, { code: "FORBIDDEN", message: "Cannot delete self", status: 403 });
    const count = await User.count();
    if (count <= 1) return sendError(res, { code: "CONFLICT", message: "Cannot delete last user", status: 409 });
    const deleted = await User.destroy({ where: { id: req.params.id } });
    if (!deleted) return sendError(res, { code: "NOT_FOUND", message: "User not found", status: 404 });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = router;
