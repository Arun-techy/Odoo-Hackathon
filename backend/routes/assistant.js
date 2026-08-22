import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAuth } from "../middleware/auth.js";
import db from "../db.js";

const router = express.Router();

const POLICY_TEXT = `
DAYFLOW HR POLICIES & GUIDELINES:
- Paid Leave (Annual Vacation): 18 days per year. Accrued monthly. Must apply at least 2 days in advance (except emergencies).
- Sick / Medical Leave: 12 days per year. Same-day application allowed; medical certificate required if >2 consecutive days.
- Unpaid Leave: Available after paid/sick leaves are exhausted, subject to Admin approval.
- Working Hours & Attendance: Standard day starts at 9:00 AM. Check-ins before 10:00 AM count as on-time. Check-ins after 10:00 AM count as late.
- Team Overlap Conflict: If 2 or more employees in the same department request overlapping leave dates, it triggers a Team Conflict warning for HR review.
- Payroll & Overtime: Salaries are disbursed on the 1st of every month. Overtime compensation is credited quarterly.
`;

const UPCOMING_HOLIDAYS = [
  { date: "2026-09-07", name: "Labor Day / Founders Day" },
  { date: "2026-10-02", name: "National Innovation Day" },
  { date: "2026-11-26", name: "Thanksgiving / Gratitude Day" },
  { date: "2026-12-25", name: "Winter Holiday / Christmas" },
  { date: "2027-01-01", name: "New Year's Day" }
];

// Helper: Calculate day difference between two YYYY-MM-DD dates inclusive
function calculateDays(startDate, endDate) {
  try {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  } catch {
    return 1;
  }
}

// Compute comprehensive employee & system context
function buildEmployeeContext(userId, isAdmin = false) {
  const user = db
    .prepare(`SELECT id, full_name, employee_code, email, department, job_title, role, salary, phone, address, created_at FROM users WHERE id = ?`)
    .get(userId);

  const todayStr = new Date().toISOString().split("T")[0];

  // Today's attendance
  const todayAttendance = db
    .prepare(`SELECT * FROM attendance WHERE user_id = ? AND date = ?`)
    .get(userId, todayStr);

  // Recent attendance history
  const recentAttendance = db
    .prepare(`SELECT date, check_in, check_out, status FROM attendance WHERE user_id = ? ORDER BY date DESC LIMIT 30`)
    .all(userId);

  // Calculate attendance stats (last 30 records)
  let presentDays = 0;
  let absentDays = 0;
  let lateDays = 0;
  recentAttendance.forEach((att) => {
    if (att.status === "Present") {
      presentDays++;
      if (att.check_in && att.check_in > "10:00:00") {
        lateDays++;
      }
    } else if (att.status === "Absent") {
      absentDays++;
    }
  });
  const onTimePercentage = presentDays > 0 ? Math.round(((presentDays - lateDays) / presentDays) * 100) : 100;

  // Leave history & accurate balance calculation
  const allLeaves = db
    .prepare(`SELECT id, leave_type, start_date, end_date, remarks, status, admin_comment, created_at FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC`)
    .all(userId);

  let paidTaken = 0;
  let sickTaken = 0;
  let unpaidTaken = 0;
  const pendingRequests = [];

  allLeaves.forEach((lv) => {
    const days = calculateDays(lv.start_date, lv.end_date);
    if (lv.status === "Approved") {
      const type = (lv.leave_type || "").toLowerCase();
      if (type.includes("paid") || type.includes("annual") || type.includes("vacation")) {
        paidTaken += days;
      } else if (type.includes("sick") || type.includes("medical")) {
        sickTaken += days;
      } else {
        unpaidTaken += days;
      }
    } else if (lv.status === "Pending") {
      pendingRequests.push({
        id: lv.id,
        leave_type: lv.leave_type,
        start_date: lv.start_date,
        end_date: lv.end_date,
        days,
        remarks: lv.remarks
      });
    }
  });

  const balances = {
    paid_leave: {
      allowed: 18,
      taken: paidTaken,
      remaining: Math.max(0, 18 - paidTaken)
    },
    sick_leave: {
      allowed: 12,
      taken: sickTaken,
      remaining: Math.max(0, 12 - sickTaken)
    },
    unpaid_leave: {
      taken: unpaidTaken
    },
    pending_count: pendingRequests.length
  };

  let adminData = null;
  if (isAdmin || user?.role === "admin") {
    const allEmployees = db.prepare(`SELECT id, full_name, employee_code, department, job_title, email FROM users ORDER BY department, full_name`).all();
    const todayAllAttendance = db.prepare(`
      SELECT a.*, u.full_name, u.department 
      FROM attendance a JOIN users u ON a.user_id = u.id 
      WHERE a.date = ?
    `).all(todayStr);

    const pendingAllLeaves = db.prepare(`
      SELECT l.*, u.full_name, u.employee_code, u.department
      FROM leave_requests l JOIN users u ON l.user_id = u.id
      WHERE l.status = 'Pending'
      ORDER BY l.start_date ASC
    `).all();

    // Detect team conflicts
    const pendingWithConflicts = pendingAllLeaves.map((r) => {
      const conflicting = pendingAllLeaves.filter((other) =>
        other.id !== r.id &&
        other.department === r.department &&
        !(other.end_date < r.start_date || other.start_date > r.end_date)
      );
      return {
        ...r,
        conflict_detected: conflicting.length > 0,
        conflicting_with: conflicting.map((c) => c.full_name)
      };
    });

    adminData = {
      total_employees: allEmployees.length,
      employees: allEmployees,
      checked_in_today_count: todayAllAttendance.length,
      pending_approvals: pendingWithConflicts,
      team_conflicts_count: pendingWithConflicts.filter((p) => p.conflict_detected).length
    };
  }

  return {
    today: todayStr,
    user,
    todayAttendance: todayAttendance ? {
      checked_in: !!todayAttendance.check_in,
      check_in_time: todayAttendance.check_in,
      check_out_time: todayAttendance.check_out,
      status: todayAttendance.status
    } : { checked_in: false, status: "Not checked in yet" },
    attendanceStats: {
      total_records: recentAttendance.length,
      present_days: presentDays,
      absent_days: absentDays,
      late_days: lateDays,
      on_time_rate_pct: onTimePercentage,
      recent: recentAttendance.slice(0, 10)
    },
    balances,
    pendingRequests,
    recentLeaves: allLeaves.slice(0, 5),
    holidays: UPCOMING_HOLIDAYS,
    adminData
  };
}

// Fallback Natural Language Processor (runs if Gemini API key is not supplied or fails)
function generateLocalFallbackResponse(question, context) {
  const q = question.toLowerCase();
  const { user, balances, todayAttendance, attendanceStats, pendingRequests, holidays, adminData, today } = context;

  // 1. Leave Balance Query
  if (q.includes("balance") || q.includes("how many leave") || q.includes("remaining leave") || q.includes("leave left") || q.includes("vacation days")) {
    return {
      answer: `### 🌴 Your Real-Time Leave Balances\n\n` +
        `Here is your up-to-date leave quota for **${user.full_name}**:\n\n` +
        `- **Paid Leave (Annual):** **${balances.paid_leave.remaining}** days remaining *(Taken: ${balances.paid_leave.taken} / ${balances.paid_leave.allowed} days)*\n` +
        `- **Sick / Medical Leave:** **${balances.sick_leave.remaining}** days remaining *(Taken: ${balances.sick_leave.taken} / ${balances.sick_leave.allowed} days)*\n` +
        `- **Unpaid Leave Taken:** **${balances.unpaid_leave.taken}** days\n` +
        (pendingRequests.length > 0 
          ? `\n> ⏳ **Pending Approvals:** You currently have **${pendingRequests.length}** pending leave request(s).`
          : `\n> ✅ **All Clear:** No pending leave requests right now.`) +
        `\n\n*Tip: You can apply for leave anytime by typing "Apply 2 days sick leave for tomorrow".*`,
      action: null
    };
  }

  // 2. Attendance Query
  if (q.includes("attendance") || q.includes("check in") || q.includes("clock") || q.includes("present") || q.includes("on time") || q.includes("late")) {
    let todayMsg = todayAttendance.checked_in
      ? `✅ **Today's Status:** Checked in at **${todayAttendance.check_in_time}** ${todayAttendance.check_out_time ? `(Checked out: ${todayAttendance.check_out_time})` : "(Currently active)"}`
      : `⚠️ **Today's Status:** Not checked in yet today (${today}).`;

    return {
      answer: `### 🕒 Attendance & Punctuality Summary\n\n` +
        `${todayMsg}\n\n` +
        `**Last 30 Days Performance:**\n` +
        `- **Days Present:** **${attendanceStats.present_days}** days\n` +
        `- **On-Time Punctuality:** **${attendanceStats.on_time_rate_pct}%**\n` +
        `- **Late Arrivals (>10:00 AM):** **${attendanceStats.late_days}** days\n` +
        `- **Absences:** **${attendanceStats.absent_days}** days\n\n` +
        `*Company policy requires check-in before 10:00 AM for on-time marking.*`,
      action: !todayAttendance.checked_in ? { type: "CHECK_IN" } : null
    };
  }

  // 3. Sick Leave / Policy Query
  if (q.includes("sick policy") || q.includes("policy") || q.includes("rules") || q.includes("guideline") || q.includes("how does leave work")) {
    return {
      answer: `### 📋 Dayflow HR Policy Quick Reference\n\n` +
        `1. **Paid Leave (18 Days):** Accrued monthly. Apply at least **2 days in advance** via Dayflow portal.\n` +
        `2. **Sick Leave (12 Days):** Same-day application allowed for medical recovery. Medical certificate needed if leave is **greater than 2 consecutive days**.\n` +
        `3. **Team Overlap Safeguard:** Requests overlapping with a teammate in your department (**${user.department}**) trigger an automated HR alert to ensure team coverage.\n` +
        `4. **Attendance:** Workday check-in is expected by **10:00 AM**.\n\n` +
        `*Feel free to ask me to draft a leave application for you!*`,
      action: null
    };
  }

  // 4. Intent to Apply Leave
  if (q.includes("apply") || q.includes("request leave") || q.includes("take off") || q.includes("book leave")) {
    const isSick = q.includes("sick") || q.includes("doctor") || q.includes("fever") || q.includes("cold") || q.includes("medical");
    const leaveType = isSick ? "Sick Leave" : "Paid Leave";
    
    // Compute tomorrow's date
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tomorrow = d.toISOString().split("T")[0];

    return {
      answer: `### ✍️ Ready to Apply for ${leaveType}\n\n` +
        `I've prepared a leave request for you. Please review the details on the action card below and click **Confirm & Submit** to log it directly with HR!`,
      action: {
        type: "APPLY_LEAVE",
        payload: {
          leave_type: leaveType,
          start_date: tomorrow,
          end_date: tomorrow,
          remarks: isSick ? "Medical recovery / sick leave" : "Personal vacation / planned time off"
        }
      }
    };
  }

  // 5. Holidays Query
  if (q.includes("holiday") || q.includes("vacation") || q.includes("off days") || q.includes("calendar")) {
    const list = holidays.map((h) => `- **${h.date}**: ${h.name}`).join("\n");
    return {
      answer: `### 📅 Upcoming Company Holidays\n\n${list}\n\n*These public holidays are paid days off and do not deduct from your 18-day Paid Leave balance.*`,
      action: null
    };
  }

  // 6. Admin Specific Query
  if (adminData && (q.includes("admin") || q.includes("pending") || q.includes("conflict") || q.includes("staff") || q.includes("employee") || q.includes("department"))) {
    return {
      answer: `### 🛡️ Dayflow Admin Intelligence Center\n\n` +
        `**Organization Overview:**\n` +
        `- **Total Employees:** **${adminData.total_employees}** active team members\n` +
        `- **Staff Checked In Today:** **${adminData.checked_in_today_count}**\n` +
        `- **Pending Leave Approvals:** **${adminData.pending_approvals.length}** requests\n` +
        `- **Team Leave Conflicts Flagged:** **${adminData.team_conflicts_count}**\n\n` +
        (adminData.pending_approvals.length > 0
          ? `**Pending Requests Requiring Review:**\n` +
            adminData.pending_approvals.slice(0, 4).map((p) => 
              `- **${p.full_name}** (${p.department}): ${p.leave_type} (${p.start_date} → ${p.end_date}) ${p.conflict_detected ? '⚠️ *[Team Overlap Conflict!]*' : ''}`
            ).join("\n")
          : `✅ *No pending leave requests awaiting approval.*`),
      action: null
    };
  }

  // 7. Profile / Identity Query
  if (q.includes("who am i") || q.includes("profile") || q.includes("my code") || q.includes("department") || q.includes("salary")) {
    return {
      answer: `### 👤 Employee Profile Details\n\n` +
        `- **Name:** ${user.full_name} (${user.employee_code})\n` +
        `- **Job Title:** ${user.job_title || "Staff"}\n` +
        `- **Department:** ${user.department || "General"}\n` +
        `- **Email:** ${user.email}\n` +
        `- **Role:** ${user.role === 'admin' ? '🛡️ Administrator / HR Manager' : '💼 Employee'}\n` +
        `- **Annual Salary:** $${(user.salary || 0).toLocaleString()}\n\n` +
        `*You can update your personal contact info in the Profile section.*`,
      action: null
    };
  }

  // Default Greeting / Help response
  return {
    answer: `### Hello ${user.full_name.split(" ")[0]}! 👋 I'm Dayflow AI HR.\n\n` +
      `I can help you manage your workday seamlessly. Here are some quick things you can ask me:\n\n` +
      `- **🌴 Check Balances:** *"How many paid and sick leaves do I have left?"*\n` +
      `- **🕒 Punctuality:** *"What is my attendance rate this month?"*\n` +
      `- **✍️ Apply Leave:** *"Apply for 1 day sick leave tomorrow"* *(I'll generate an instant 1-click application!)*\n` +
      `- **📋 HR Policies:** *"What is the sick leave and overtime policy?"*\n` +
      `- **📅 Holidays:** *"When is the next company holiday?"*\n` +
      (user.role === 'admin' ? `- **🛡️ Admin Intel:** *"Show pending leave requests and team conflicts"*\n` : '') +
      `\n*What would you like assistance with today?*`,
    action: null
  };
}

// POST /api/assistant/ask - Main Assistant Endpoint
router.post("/ask", requireAuth, async (req, res) => {
  try {
    const { question, history } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";
    const context = buildEmployeeContext(userId, isAdmin);

    // Check if API Key is configured and valid
    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidKey = apiKey && apiKey !== "your_gemini_api_key_here" && apiKey.trim().length > 10;

    if (!hasValidKey) {
      // Use our ultra-fast intelligent local NLP fallback
      const localResult = generateLocalFallbackResponse(question, context);
      return res.json({
        answer: localResult.answer,
        action: localResult.action,
        balances: context.balances,
        source: "local_engine"
      });
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const systemPrompt = `
You are Dayflow's AI HR Assistant, embedded inside the Dayflow HRMS application.
Answer the employee's questions accurately, warmly, and concisely using the real employee data, live balances, attendance logs, and company policy provided below.

FORMATTING RULES:
- Use clean Markdown with headers (###), bold text, and bullet lists for easy scanning.
- DO NOT output raw JSON.
- If the user asks to apply for leave (e.g., "apply for sick leave tomorrow"), provide a helpful summary AND include a special action block at the very end of your response in the exact format:
[ACTION:APPLY_LEAVE:{"leave_type":"Sick Leave","start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD","remarks":"reason"}]
- If the user asks to check in / clock in, include: [ACTION:CHECK_IN]
- Today's date is: ${context.today}

EMPLOYEE CONTEXT:
${JSON.stringify({
  user: context.user,
  todayAttendance: context.todayAttendance,
  attendanceStats: context.attendanceStats,
  liveBalances: context.balances,
  pendingRequests: context.pendingRequests,
  recentLeaves: context.recentLeaves,
  holidays: context.holidays,
  adminData: context.adminData
}, null, 2)}

${POLICY_TEXT}
`;

      // Start multi-turn chat if history is provided
      let chatHistory = [];
      if (Array.isArray(history) && history.length > 0) {
        chatHistory = history.slice(-6).map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text || "" }]
        }));
      }

      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "Understood. I am Dayflow AI HR Assistant, fully initialized with the live employee context, leave quotas, and HR policies." }] },
          ...chatHistory
        ]
      });

      const result = await chat.sendMessage(question);
      let rawAnswer = result?.response?.text() || "";

      // Extract Action tag if present
      let action = null;
      const actionMatch = rawAnswer.match(/\[ACTION:([A-Z_]+)(?::(\{.*?\}))?\]/);
      if (actionMatch) {
        const actionType = actionMatch[1];
        let payload = {};
        if (actionMatch[2]) {
          try {
            payload = JSON.parse(actionMatch[2]);
          } catch (e) {
            console.error("Action parse error:", e);
          }
        }
        action = { type: actionType, payload };
        // Clean the action tag out of user facing text
        rawAnswer = rawAnswer.replace(/\[ACTION:.*?\]/g, "").trim();
      }

      // If user asks about leave and no action was detected, check if local fallback detects action
      if (!action && (question.toLowerCase().includes("apply") || question.toLowerCase().includes("request leave"))) {
        const fallback = generateLocalFallbackResponse(question, context);
        if (fallback.action) action = fallback.action;
      }

      return res.json({
        answer: rawAnswer,
        action,
        balances: context.balances,
        source: "gemini_2_flash"
      });
    } catch (geminiError) {
      console.warn("Gemini API call failed or rate-limited, switching to resilient local engine:", geminiError.message);
      const fallbackResult = generateLocalFallbackResponse(question, context);
      return res.json({
        answer: fallbackResult.answer,
        action: fallbackResult.action,
        balances: context.balances,
        source: "resilient_fallback"
      });
    }
  } catch (err) {
    console.error("Assistant top-level error:", err);
    res.status(500).json({ error: "Something went wrong with the AI assistant" });
  }
});

// GET /api/assistant/stats - Get Live Leave Balances & Metrics for the chat header
router.get("/stats", requireAuth, (req, res) => {
  try {
    const context = buildEmployeeContext(req.user.id, req.user.role === "admin");
    res.json({
      balances: context.balances,
      todayAttendance: context.todayAttendance,
      attendanceStats: context.attendanceStats,
      user: {
        full_name: context.user.full_name,
        role: context.user.role,
        department: context.user.department
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;