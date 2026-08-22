import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";

const router = express.Router();

// SIGN UP
router.post("/signup", (req, res) => {
  const { employee_code, full_name, email, password, role } = req.body;

  if (!employee_code || !full_name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ? OR employee_code = ?")
    .get(email, employee_code);
  if (existing) {
    return res.status(409).json({ error: "Email or Employee ID already registered" });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const safeRole = role === "admin" ? "admin" : "employee";

  const result = db.prepare(`
    INSERT INTO users (employee_code, full_name, email, password, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(employee_code, full_name, email, hashed, safeRole);

  const token = jwt.sign(
    { id: result.lastInsertRowid, role: safeRole, full_name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.status(201).json({ token, user: { id: result.lastInsertRowid, full_name, email, role: safeRole } });
});

// SIGN IN
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role }
  });
});

export default router;
