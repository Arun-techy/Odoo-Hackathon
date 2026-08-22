'use strict';

/**
 * routes/attendance.js
 * Check-in, check-out, attendance history, today's status.
 * All routes require a valid JWT.
 */

const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

/** Returns today's date in YYYY-MM-DD (server local time) */
function today() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

/* ──────────────────────────────────────────────────────────────────────────
   POST /api/attendance/checkin
   Marks check-in for today. Error if already checked in.
────────────────────────────────────────────────────────────────────────── */
router.post('/checkin', (req, res) => {
  const date     = today();
  const existing = db.prepare(
    'SELECT * FROM attendance WHERE user_id = ? AND date = ?'
  ).get(req.user.id, date);

  if (existing && existing.check_in) {
    return res.status(400).json({
      error    : 'Already checked in today',
      check_in : existing.check_in
    });
  }

  const now = new Date().toISOString();

  if (existing) {
    // Row exists but check_in is null (edge case)
    db.prepare('UPDATE attendance SET check_in = ? WHERE id = ?').run(now, existing.id);
  } else {
    db.prepare(
      'INSERT INTO attendance (user_id, date, check_in) VALUES (?, ?, ?)'
    ).run(req.user.id, date, now);
  }

  // Determine on-time / late status (before 10:00 AM = on-time)
  const hour = new Date(now).getHours();
  const status = hour < 10 ? 'on-time' : 'late';

  res.json({ message: 'Checked in successfully', check_in: now, status });
});

/* ──────────────────────────────────────────────────────────────────────────
   POST /api/attendance/checkout
   Marks check-out. Error if not checked in, or already checked out.
────────────────────────────────────────────────────────────────────────── */
router.post('/checkout', (req, res) => {
  const date     = today();
  const existing = db.prepare(
    'SELECT * FROM attendance WHERE user_id = ? AND date = ?'
  ).get(req.user.id, date);

  if (!existing || !existing.check_in) {
    return res.status(400).json({ error: 'You must check in before checking out' });
  }
  if (existing.check_out) {
    return res.status(400).json({
      error     : 'Already checked out today',
      check_out : existing.check_out
    });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE attendance SET check_out = ? WHERE id = ?').run(now, existing.id);

  // Calculate duration
  const diffMs  = new Date(now) - new Date(existing.check_in);
  const hours   = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);

  res.json({
    message   : 'Checked out successfully',
    check_out : now,
    duration  : `${hours}h ${minutes}m`
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   GET /api/attendance
   Returns own attendance history ordered by date DESC (for heatmap).
────────────────────────────────────────────────────────────────────────── */
router.get('/', (req, res) => {
  const records = db.prepare(`
    SELECT id, date, check_in, check_out
    FROM attendance
    WHERE user_id = ?
    ORDER BY date DESC
  `).all(req.user.id);
  res.json(records);
});

/* ──────────────────────────────────────────────────────────────────────────
   GET /api/attendance/today
   Returns today's check-in/out status for the logged-in user.
   NOTE: declared before /:userId so 'today' is not parsed as an id.
────────────────────────────────────────────────────────────────────────── */
router.get('/today', (req, res) => {
  const record = db.prepare(
    'SELECT * FROM attendance WHERE user_id = ? AND date = ?'
  ).get(req.user.id, today());

  if (!record) {
    return res.json({ date: today(), checked_in: false, checked_out: false });
  }
  res.json({
    ...record,
    checked_in : !!record.check_in,
    checked_out: !!record.check_out
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   GET /api/attendance/:userId — admin only — view any employee's history
────────────────────────────────────────────────────────────────────────── */
router.get('/:userId', requireAdmin, (req, res) => {
  // Verify the employee exists
  const employee = db.prepare('SELECT id, name FROM users WHERE id = ?').get(req.params.userId);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const records = db.prepare(`
    SELECT id, date, check_in, check_out
    FROM attendance
    WHERE user_id = ?
    ORDER BY date DESC
  `).all(req.params.userId);

  res.json({ employee, records });
});

module.exports = router;
