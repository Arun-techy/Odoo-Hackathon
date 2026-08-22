import express from "express";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET own profile
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare(`
    SELECT id, employee_code, full_name, email, role, phone, address,
           job_title, department, salary, profile_picture
    FROM users WHERE id = ?
  `).get(req.user.id);
  res.json(user);
});

// EDIT own profile (limited fields)
router.put("/me", requireAuth, (req, res) => {
  const { phone, address, profile_picture } = req.body;
  db.prepare(`
    UPDATE users SET phone = ?, address = ?, profile_picture = ? WHERE id = ?
  `).run(phone, address, profile_picture, req.user.id);
  res.json({ message: "Profile updated" });
});

// ADMIN: list all employees
router.get("/", requireAuth, requireAdmin, (req, res) => {
  const employees = db.prepare(`
    SELECT id, employee_code, full_name, email, role, phone, address,
           job_title, department, salary FROM users ORDER BY id
  `).all();
  res.json(employees);
});

// ADMIN: edit any employee's full details
router.put("/:id", requireAuth, requireAdmin, (req, res) => {
  const { full_name, phone, address, job_title, department, salary } = req.body;
  db.prepare(`
    UPDATE users SET full_name = ?, phone = ?, address = ?, job_title = ?,
    department = ?, salary = ? WHERE id = ?
  `).run(full_name, phone, address, job_title, department, salary, req.params.id);
  res.json({ message: "Employee updated" });
});

// ADMIN: get one employee's full detail (for payroll/profile drill-in)
router.get("/:id", requireAuth, requireAdmin, (req, res) => {
  const user = db.prepare(`
    SELECT id, employee_code, full_name, email, role, phone, address,
           job_title, department, salary FROM users WHERE id = ?
  `).get(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});

export default router;
