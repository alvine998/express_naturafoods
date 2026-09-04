const express = require("express");
const UserRole = require("../models/UserRole");
const User = require("../models/User");
const Role = require("../models/Role");

const router = express.Router();

// GET /api/user-roles - list all assignments
router.get("/", async (req, res) => {
  try {
    const userRoles = await UserRole.findAll({
      include: [
        { model: User, attributes: ["id", "name", "email"] },
        { model: Role, attributes: ["id", "name", "description"] },
      ],
    });
    res.json(userRoles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/user-roles/user/:userId - get roles for one user
router.get("/user/:userId", async (req, res) => {
  try {
    const userRoles = await UserRole.findAll({
      where: { user_id: req.params.userId },
      include: [{ model: Role, attributes: ["id", "name", "description"] }],
    });
    if (!userRoles.length) {
      return res.status(404).json({ message: "No roles found for this user" });
    }
    res.json(userRoles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/user-roles - assign a role to a user
router.post("/", async (req, res) => {
  try {
    const { user_id, role_id } = req.body;

    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const role = await Role.findByPk(role_id);
    if (!role) return res.status(404).json({ message: "Role not found" });

    const userRole = await UserRole.create({ user_id, role_id });
    res.status(201).json(userRole);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Assignment already exists" });
    }
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/user-roles/user/:userId - replace all roles for a user
router.put("/user/:userId", async (req, res) => {
  try {
    const { role_ids } = req.body;
    if (!Array.isArray(role_ids)) {
      return res.status(400).json({ message: "role_ids must be an array" });
    }

    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const roles = await Role.findAll({ where: { id: role_ids } });
    if (roles.length !== role_ids.length) {
      return res.status(400).json({ message: "One or more roles not found" });
    }

    await UserRole.destroy({ where: { user_id: req.params.userId } });
    const assignments = role_ids.map((role_id) => ({
      user_id: req.params.userId,
      role_id,
    }));
    await UserRole.bulkCreate(assignments);

    res.json({ user_id: req.params.userId, role_ids });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/user-roles/user/:userId - remove all roles from a user
router.delete("/user/:userId", async (req, res) => {
  try {
    const deleted = await UserRole.destroy({ where: { user_id: req.params.userId } });
    if (!deleted) return res.status(404).json({ message: "No assignments found for this user" });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/user-roles/user/:userId/role/:roleId - remove one assignment
router.delete("/user/:userId/role/:roleId", async (req, res) => {
  try {
    const deleted = await UserRole.destroy({
      where: { user_id: req.params.userId, role_id: req.params.roleId },
    });
    if (!deleted) return res.status(404).json({ message: "Assignment not found" });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
