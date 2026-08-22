import express from "express";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();
const today = () => new Date().toISOString().split("T")[0];
const nowTime = () => new Date().toTimeString().split(" ")[0];

// CHECK-IN
router.post("/check-in", requireAuth, (req, res) => {
  const date = today();
  const existing = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?")
    .get(req.user.id, date);

  if (existing && existing.check_in) {
    return res.status(400).json({ error: "Already checked in today" });
  }

  if (existing) {
    db.prepare("UPDATE attendance SET check_in = ?, status = 'Present' WHERE id = ?")
      .run(nowTime(), existing.id);
  } else {
    db.prepare(`
      INSERT INTO attendance (user_id, date, check_in, status) VALUES (?, ?, ?, 'Present')
    `).run(req.user.id, date, nowTime());
  }
  res.json({ message: "Checked in", time: nowTime() });
});

// CHECK-OUT
router.post("/check-out", requireAuth, (req, res) => {
  const date = today();
  const existing = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?")
    .get(req.user.id, date);

  if (!existing || !existing.check_in) {
    return res.status(400).json({ error: "You must check in first" });
  }
  db.prepare("UPDATE attendance SET check_out = ? WHERE id = ?").run(nowTime(), existing.id);
  res.json({ message: "Checked out", time: nowTime() });
});

// GET own attendance (daily/weekly view via query params optional)
router.get("/me", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC LIMIT 60")
    .all(req.user.id);
  res.json(rows);
});

// ADMIN: view all employees' attendance
router.get("/", requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, u.full_name, u.employee_code
    FROM attendance a JOIN users u ON a.user_id = u.id
    ORDER BY a.date DESC LIMIT 200
  `).all();
  res.json(rows);
});

export default router;
