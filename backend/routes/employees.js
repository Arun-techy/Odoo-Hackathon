'use strict';

/**
 * routes/employees.js
 * Employee profile, list, and payroll management.
 * All routes require a valid JWT (verifyToken applied router-wide).
 */

const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

// Fields safe to return (no password)
const SELECT_SAFE = `
  SELECT id, name, email, role, department, phone, address, salary, created_at
  FROM users
`;

/* ──────────────────────────────────────────────────────────────────────────
   GET /api/employees          — admin only — list all employees
────────────────────────────────────────────────────────────────────────── */
router.get('/', requireAdmin, (req, res) => {
  const employees = db.prepare(SELECT_SAFE + ' ORDER BY id ASC').all();
  res.json(employees);
});

/* ──────────────────────────────────────────────────────────────────────────
   GET /api/employees/me       — any authenticated user — own profile
   NOTE: must be declared BEFORE /:id so Express doesn't treat 'me' as an id
────────────────────────────────────────────────────────────────────────── */
router.get('/me', (req, res) => {
  const user = db.prepare(SELECT_SAFE + ' WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

/* ──────────────────────────────────────────────────────────────────────────
   PUT /api/employees/me       — any authenticated user — edit own phone/address
────────────────────────────────────────────────────────────────────────── */
router.put('/me', (req, res) => {
  const { phone, address } = req.body;

  // At least one field must be supplied
  if (phone === undefined && address === undefined) {
    return res.status(400).json({ error: 'Provide at least one of: phone, address' });
  }

  // Read current values so we don't wipe fields the caller didn't supply
  const current = db.prepare('SELECT phone, address FROM users WHERE id = ?').get(req.user.id);

  db.prepare('UPDATE users SET phone = ?, address = ? WHERE id = ?').run(
    phone   !== undefined ? phone   : current.phone,
    address !== undefined ? address : current.address,
    req.user.id
  );

  const updated = db.prepare(SELECT_SAFE + ' WHERE id = ?').get(req.user.id);
  res.json({ message: 'Profile updated', user: updated });
});

/* ──────────────────────────────────────────────────────────────────────────
   GET /api/employees/:id      — admin only — view any employee
────────────────────────────────────────────────────────────────────────── */
router.get('/:id', requireAdmin, (req, res) => {
  const user = db.prepare(SELECT_SAFE + ' WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Employee not found' });
  res.json(user);
});

/* ──────────────────────────────────────────────────────────────────────────
   PUT /api/employees/:id      — admin only — update name/dept/phone/address
────────────────────────────────────────────────────────────────────────── */
router.put('/:id', requireAdmin, (req, res) => {
  const { name, department, phone, address } = req.body;

  const employee = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  db.prepare(`
    UPDATE users
    SET name = ?, department = ?, phone = ?, address = ?
    WHERE id = ?
  `).run(
    name       !== undefined ? name       : employee.name,
    department !== undefined ? department : employee.department,
    phone      !== undefined ? phone      : employee.phone,
    address    !== undefined ? address    : employee.address,
    req.params.id
  );

  const updated = db.prepare(SELECT_SAFE + ' WHERE id = ?').get(req.params.id);
  res.json({ message: 'Employee updated', employee: updated });
});

/* ──────────────────────────────────────────────────────────────────────────
   PUT /api/employees/:id/salary  — admin only — update payroll
   Body: { salary }
────────────────────────────────────────────────────────────────────────── */
router.put('/:id/salary', requireAdmin, (req, res) => {
  const { salary } = req.body;

  if (salary === undefined || salary === null) {
    return res.status(400).json({ error: 'salary is required' });
  }
  const salaryNum = Number(salary);
  if (isNaN(salaryNum) || salaryNum < 0) {
    return res.status(400).json({ error: 'salary must be a non-negative number' });
  }

  const employee = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  db.prepare('UPDATE users SET salary = ? WHERE id = ?').run(salaryNum, req.params.id);
  res.json({ message: 'Salary updated', salary: salaryNum });
});

module.exports = router;
