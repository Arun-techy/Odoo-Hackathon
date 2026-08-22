'use strict';

/**
 * routes/auth.js
 * Public endpoints: signup + login
 */

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

const router = express.Router();

/* ──────────────────────────────────────────────────────────────────────────
   POST /api/auth/signup
   Body: { name, email, password, department?, phone? }
   Returns: { token, user }
────────────────────────────────────────────────────────────────────────── */
router.post('/signup', (req, res) => {
  const { name, email, password, department, phone } = req.body;

  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  if (typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Provide a valid email address' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Duplicate check
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const cleanEmail     = email.toLowerCase().trim();

  const result = db.prepare(`
    INSERT INTO users (name, email, password, role, department, phone)
    VALUES (?, ?, ?, 'employee', ?, ?)
  `).run(name.trim(), cleanEmail, hashedPassword, department || 'General', phone || '');

  const token = jwt.sign(
    { id: result.lastInsertRowid, email: cleanEmail, role: 'employee' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: {
      id        : result.lastInsertRowid,
      name      : name.trim(),
      email     : cleanEmail,
      role      : 'employee',
      department: department || 'General'
    }
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   POST /api/auth/login
   Body: { email, password }
   Returns: { token, user }
────────────────────────────────────────────────────────────────────────── */
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(
    (email || '').toLowerCase().trim()
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id        : user.id,
      name      : user.name,
      email     : user.email,
      role      : user.role,
      department: user.department,
      phone     : user.phone,
      address   : user.address,
      salary    : user.salary
    }
  });
});

module.exports = router;
