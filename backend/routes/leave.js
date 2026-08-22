'use strict';

/**
 * routes/leave.js
 * Leave application, approval/rejection, and conflict detection.
 * All routes require a valid JWT.
 */

const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

const VALID_TYPES = ['Paid', 'Sick', 'Unpaid'];

/* ──────────────────────────────────────────────────────────────────────────
   POST /api/leave/apply
   Body: { type, start_date, end_date, reason? }
   Creates a new leave request with status 'Pending'.
────────────────────────────────────────────────────────────────────────── */
router.post('/apply', (req, res) => {
  const { type, start_date, end_date, reason } = req.body;

  // Validation
  if (!type || !start_date || !end_date) {
    return res.status(400).json({ error: 'type, start_date, and end_date are required' });
  }
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({
      error: `type must be one of: ${VALID_TYPES.join(', ')}`
    });
  }

  // Date format sanity check (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
    return res.status(400).json({ error: 'Dates must be in YYYY-MM-DD format' });
  }

  if (new Date(start_date) > new Date(end_date)) {
    return res.status(400).json({ error: 'start_date cannot be after end_date' });
  }

  const result = db.prepare(`
    INSERT INTO leaves (user_id, type, start_date, end_date, reason, status)
    VALUES (?, ?, ?, ?, ?, 'Pending')
  `).run(req.user.id, type, start_date, end_date, reason || '');

  res.status(201).json({
    message: 'Leave application submitted',
    id     : result.lastInsertRowid
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   GET /api/leave
   - Employee: own leave history (newest first)
   - Admin + ?all=true: everyone's leaves joined with employee name/dept
────────────────────────────────────────────────────────────────────────── */
router.get('/', (req, res) => {
  if (req.user.role === 'admin' && req.query.all === 'true') {
    const leaves = db.prepare(`
      SELECT
        l.id, l.type, l.start_date, l.end_date, l.reason,
        l.status, l.created_at,
        u.id   AS employee_id,
        u.name AS employee_name,
        u.department
      FROM leaves l
      JOIN users u ON u.id = l.user_id
      ORDER BY l.created_at DESC
    `).all();
    return res.json(leaves);
  }

  const leaves = db.prepare(`
    SELECT id, type, start_date, end_date, reason, status, created_at
    FROM leaves
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);

  res.json(leaves);
});

/* ──────────────────────────────────────────────────────────────────────────
   GET /api/leave/:id/conflicts  — admin only
   Detects overlapping Pending/Approved leaves from a DIFFERENT employee
   in the SAME department as the requested leave.
   Returns: { hasConflict: bool, conflicts: [...] }
────────────────────────────────────────────────────────────────────────── */
router.get('/:id/conflicts', requireAdmin, (req, res) => {
  const leave = db.prepare(`
    SELECT l.*, u.department, u.name AS employee_name
    FROM leaves l
    JOIN users u ON u.id = l.user_id
    WHERE l.id = ?
  `).get(req.params.id);

  if (!leave) return res.status(404).json({ error: 'Leave request not found' });

  // Date-overlap condition: A overlaps B iff A.start <= B.end AND A.end >= B.start
  const conflicts = db.prepare(`
    SELECT
      l.id, l.user_id, u.name AS employee_name,
      l.type, l.start_date, l.end_date, l.status
    FROM leaves l
    JOIN users u ON u.id = l.user_id
    WHERE u.department = ?
      AND l.id       != ?
      AND l.user_id  != ?
      AND l.status IN ('Pending', 'Approved')
      AND l.start_date <= ?
      AND l.end_date   >= ?
    ORDER BY l.start_date ASC
  `).all(
    leave.department,
    leave.id,
    leave.user_id,
    leave.end_date,
    leave.start_date
  );

  res.json({
    hasConflict     : conflicts.length > 0,
    requestedLeave  : {
      id          : leave.id,
      employee    : leave.employee_name,
      department  : leave.department,
      start_date  : leave.start_date,
      end_date    : leave.end_date,
      type        : leave.type,
      status      : leave.status
    },
    conflicts
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   PUT /api/leave/:id/approve  — admin only
────────────────────────────────────────────────────────────────────────── */
router.put('/:id/approve', requireAdmin, (req, res) => {
  const leave = db.prepare('SELECT id, status FROM leaves WHERE id = ?').get(req.params.id);
  if (!leave) return res.status(404).json({ error: 'Leave request not found' });

  if (leave.status === 'Approved') {
    return res.status(400).json({ error: 'Leave is already approved' });
  }

  db.prepare("UPDATE leaves SET status = 'Approved' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Leave approved', id: Number(req.params.id) });
});

/* ──────────────────────────────────────────────────────────────────────────
   PUT /api/leave/:id/reject   — admin only
────────────────────────────────────────────────────────────────────────── */
router.put('/:id/reject', requireAdmin, (req, res) => {
  const leave = db.prepare('SELECT id, status FROM leaves WHERE id = ?').get(req.params.id);
  if (!leave) return res.status(404).json({ error: 'Leave request not found' });

  if (leave.status === 'Rejected') {
    return res.status(400).json({ error: 'Leave is already rejected' });
  }

  db.prepare("UPDATE leaves SET status = 'Rejected' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Leave rejected', id: Number(req.params.id) });
});

module.exports = router;
