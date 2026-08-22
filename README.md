# Dayflow – HRMS (Odoo Hackathon)

Every workday, perfectly aligned.

## Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express + SQLite (better-sqlite3)
- Auth: JWT
- Differentiator: AI HR Assistant powered by Google Gemini (personalized answers using the employee's real leave/attendance data), plus automatic team-leave-conflict flagging for admins.

## Quick Start (each teammate runs this locally)

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# open .env and paste your Gemini API key (optional — app works without it, AI chat just shows a setup message)
npm run dev
```
Backend runs on **http://localhost:5000**
A default admin account is auto-created on first run:
- Email: `admin@dayflow.com`
- Password: `Admin@123`

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on **http://localhost:5173** and proxies `/api` calls to the backend.

## What's already built
- Sign up / Sign in (JWT, roles: employee / admin)
- Employee Dashboard + Admin Dashboard
- Profile view/edit (employees edit phone/address only; admin edits everything)
- Attendance: check-in/check-out, daily log, visual heatmap
- Leave: apply, approve/reject, with **team-conflict auto-flagging** (admin sees a warning if 2+ people from the same department are off on overlapping dates)
- AI HR Assistant chat widget (bottom-right bubble) — answers questions using the logged-in employee's real leave/attendance data + a policy blurb

## Suggested team split from here
- **Backend person:** add validation, payroll editing for admin, polish error handling
- **Frontend person A:** polish Employee views, mobile responsiveness
- **Frontend person B:** polish Admin views, employee detail drill-down, salary editing UI
- **4th person:** demo video script + Gemini API key setup + testing the full flow end-to-end

## Notes
- DB is a local file `backend/dayflow.db` (SQLite) — no server setup needed.
- Keep all code in a **single branch** per hackathon submission rules.
- Remember: add your evaluator as a GitHub collaborator (already done ✅) and submit your repo link + video by the deadlines shown on the hackathon portal.
