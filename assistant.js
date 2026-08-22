import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAuth } from "../middleware/auth.js";
import db from "../db.js";

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Edit this to match your actual company policy
const POLICY_TEXT = `
DAYFLOW HR POLICY (Summary):
- Paid Leave: 18 days/year, accrued monthly. Apply at least 2 days in advance except emergencies.
- Sick Leave: 12 days/year. Same-day application allowed; medical certificate needed if >2 consecutive days.
- Unpaid Leave: Available after paid/sick leave is exhausted, subject to admin approval.
- Attendance: Check-in before 10:00 AM counts as on-time.
- Leave requests overlapping with a teammate in the same department are flagged for admin review.
`;

router.post("/ask", requireAuth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "AI assistant is not configured (missing API key)" });
    }

    const userId = req.user.id;

    const user = db
      .prepare(`SELECT id, full_name, employee_code, department, job_title, role FROM users WHERE id = ?`)
      .get(userId);

    const recentAttendance = db
      .prepare(`
        SELECT date, check_in, check_out, status
        FROM attendance
        WHERE user_id = ?
        ORDER BY date DESC
        LIMIT 15
      `)
      .all(userId);

    const leaveHistory = db
      .prepare(`
        SELECT leave_type, start_date, end_date, status, remarks, admin_comment
        FROM leave_requests
        WHERE user_id = ?
        ORDER BY start_date DESC
        LIMIT 10
      `)
      .all(userId);

    const prompt = `
You are Dayflow's HR Assistant. Answer ONLY using the data and policy given below.
If the answer isn't in the data/policy, say you don't have that information — do not make things up.
Be concise and friendly. Use bullet points for lists. Do not repeat the raw JSON back to the user.

EMPLOYEE:
${JSON.stringify(user, null, 2)}

RECENT ATTENDANCE (last 15 records):
${JSON.stringify(recentAttendance, null, 2)}

LEAVE HISTORY (last 10 records):
${JSON.stringify(leaveHistory, null, 2)}

${POLICY_TEXT}

EMPLOYEE QUESTION: ${question}
`;

    const result = await model.generateContent(prompt);
    const answer = result?.response?.text();

    if (!answer) {
      return res.status(502).json({ error: "AI assistant did not return a response" });
    }

    res.json({ answer });
  } catch (err) {
    console.error("Assistant error:", err);
    res.status(500).json({ error: "Something went wrong with the AI assistant" });
  }
});

export default router;