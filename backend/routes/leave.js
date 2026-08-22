import express from "express";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// APPLY for leave
router.post("/", requireAuth, (req, res) => {
  const { leave_type, start_date, end_date, remarks } = req.body;
  if (!leave_type || !start_date || !end_date) {
    return res.status(400).json({ error: "leave_type, start_date, end_date are required" });
  }
  const result = db.prepare(`
    INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, remarks)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, leave_type, start_date, end_date, remarks || "");
  res.status(201).json({ message: "Leave request submitted", id: result.lastInsertRowid });
});

// GET own leave requests
router.get("/me", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id);
  res.json(rows);
});

// ADMIN: view all leave requests, with a simple team-conflict flag
router.get("/", requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT l.*, u.full_name, u.employee_code, u.department
    FROM leave_requests l JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC
  `).all();

  // Differentiator: flag if >=2 people from the same department are on
  // Approved/Pending leave overlapping the same date range
  const withConflictFlag = rows.map((r) => {
    const overlapping = rows.filter((other) =>
      other.id !== r.id &&
      other.department === r.department &&
      other.status !== "Rejected" &&
      !(other.end_date < r.start_date || other.start_date > r.end_date)
    );
    return { ...r, team_conflict: overlapping.length >= 1 };
  });

  res.json(withConflictFlag);
});

// ADMIN: approve/reject
router.put("/:id", requireAuth, requireAdmin, (req, res) => {
  const { status, admin_comment } = req.body;
  if (!["Approved", "Rejected", "Pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  db.prepare("UPDATE leave_requests SET status = ?, admin_comment = ? WHERE id = ?")
    .run(status, admin_comment || "", req.params.id);
  res.json({ message: `Leave ${status.toLowerCase()}` });
});

export default router;
