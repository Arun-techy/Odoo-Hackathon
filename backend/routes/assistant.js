'use strict';

/**
 * routes/assistant.js
 * Gemini-powered HR chatbot.
 * Fetches the employee's real leave + attendance data from the DB and builds
 * a context-rich prompt so Gemini answers using actual records.
 */

const express = require('express');
const fetch   = require('node-fetch');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

/* ──────────────────────────────────────────────────────────────────────────
   Static HR policy reference injected into every Gemini prompt
────────────────────────────────────────────────────────────────────────── */
const HR_POLICY = `
=== Dayflow HR Policy (2026) ===
• Paid leave    : 12 days per calendar year (accrued monthly ≈ 1 day/month).
• Sick leave    : 8 days per calendar year. 1-day sick leave needs no prior
                  approval; 2+ consecutive days require a medical certificate.
• Unpaid leave  : Available any time; the corresponding salary amount is
                  deducted from the month's payroll.
• Attendance    : Check-in before 10:00 AM is counted as "on-time".
                  Check-in at or after 10:00 AM is marked "late".
• Conflicts     : A leave request that overlaps with a teammate's Pending or
                  Approved leave in the same department is flagged and requires
                  admin review before approval.
• Leave status  : Pending → Approved / Rejected by admin.
`.trim();

/* ──────────────────────────────────────────────────────────────────────────
   POST /api/assistant/chat
   Body: { message: string }
   Returns: { reply: string }
────────────────────────────────────────────────────────────────────────── */
router.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required and must be a non-empty string' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server. Add it to your .env file.'
    });
  }

  try {
    /* ── Fetch employee context ─────────────────────────────────────── */
    const user = db.prepare(
      'SELECT name, email, department, salary FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Last 10 leave records
    const leaves = db.prepare(`
      SELECT type, start_date, end_date, reason, status
      FROM leaves
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(req.user.id);

    // Last 14 attendance records
    const attendance = db.prepare(`
      SELECT date, check_in, check_out
      FROM attendance
      WHERE user_id = ?
      ORDER BY date DESC
      LIMIT 14
    `).all(req.user.id);

    // Quick leave-balance summary
    const usedPaid   = leaves.filter(l => l.type === 'Paid'   && l.status === 'Approved').length;
    const usedSick   = leaves.filter(l => l.type === 'Sick'   && l.status === 'Approved').length;
    const usedUnpaid = leaves.filter(l => l.type === 'Unpaid' && l.status === 'Approved').length;
    const pendingCount = leaves.filter(l => l.status === 'Pending').length;

    // Attendance punctuality summary
    const lateCount = attendance.filter(a => {
      if (!a.check_in) return false;
      return new Date(a.check_in).getHours() >= 10;
    }).length;

    /* ── Build Gemini prompt ────────────────────────────────────────── */
    const prompt = `
You are Dayflow's friendly and professional HR Assistant.
Answer the employee's question concisely (2–5 sentences) using ONLY the
context below. If the context doesn't contain enough information to answer
a specific question, say so clearly rather than guessing.

--- EMPLOYEE PROFILE ---
Name       : ${user.name}
Department : ${user.department}
Email      : ${user.email}

--- LEAVE BALANCE SUMMARY (this calendar year) ---
Paid leave used   : ${usedPaid} of 12 days approved
Sick leave used   : ${usedSick} of 8 days approved
Unpaid leave used : ${usedUnpaid} days approved
Pending requests  : ${pendingCount}

--- RECENT LEAVE RECORDS (last 10) ---
${leaves.length ? JSON.stringify(leaves, null, 2) : 'No leave records found.'}

--- RECENT ATTENDANCE (last 14 days) ---
${attendance.length ? JSON.stringify(attendance, null, 2) : 'No attendance records found.'}
Late check-ins (at or after 10:00 AM): ${lateCount} of ${attendance.length} days recorded.

--- HR POLICY REFERENCE ---
${HR_POLICY}

--- EMPLOYEE QUESTION ---
${message.trim()}
`.trim();

    /* ── Call Gemini API ────────────────────────────────────────────── */
    const geminiEndpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent` +
      `?key=${process.env.GEMINI_API_KEY}`;

    const geminiRes = await fetch(geminiEndpoint, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature    : 0.4,
          maxOutputTokens: 512
        }
      })
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini API error:', JSON.stringify(data, null, 2));
      return res.status(502).json({
        error  : 'Gemini API request failed',
        details: data?.error?.message || 'Unknown Gemini error'
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "I'm sorry, I couldn't generate a response right now. Please try again.";

    res.json({ reply });

  } catch (err) {
    console.error('Assistant route error:', err);
    res.status(500).json({ error: 'Assistant failed to respond. Please try again.' });
  }
});

module.exports = router;
