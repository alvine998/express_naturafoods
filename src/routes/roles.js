const express = require("express");
const Role = require("../models/Role");

const router = express.Router();

// GET /api/roles - list all roles
router.get("/", async (req, res) => {
  try {
    const roles = await Role.findAll();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/roles/:id - get one role
router.get("/:id", async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json(role);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/roles - create role
router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body;
    const role = await Role.create({ name, description });
    res.status(201).json(role);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Role already exists" });
    }
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/roles/:id - update role
router.put("/:id", async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: "Role not found" });

    const { name, description } = req.body;
    if (name !== undefined) role.name = name;
    if (description !== undefined) role.description = description;
    await role.save();

    res.json(role);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Role already exists" });
    }
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/roles/:id - delete role
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Role.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Role not found" });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
