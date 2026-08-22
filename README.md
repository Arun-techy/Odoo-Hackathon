# Odoo-Hackathon
# Dayflow — Human Resource Management System

**Every workday, perfectly aligned.**

Built for the **Odoo x NMIT Bangalore Hackathon 2026**.

---

## 📌 Problem Statement

Dayflow digitizes and streamlines core HR operations — employee onboarding, profile management, attendance tracking, leave management, payroll visibility, and approval workflows — for both Admins/HR Officers and Employees.

---

## 🚀 What Makes Dayflow Different

- **AI HR Assistant** — an in-app chatbot (powered by Google Gemini) that answers employee questions like *"How many leave days do I have left?"* using their **real, personal** attendance and leave data — not generic answers.
- **Smart Team-Conflict Detection** — when reviewing leave requests, Admins automatically see a warning if two or more employees from the same department have overlapping leave dates, helping prevent understaffing.
- **Visual Attendance Heatmap** — attendance history shown as a color-coded heatmap instead of a plain table, for faster scanning.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | SQLite (via better-sqlite3) — zero setup, file-based |
| Auth | JWT (JSON Web Tokens) |
| AI | Google Gemini API |
| Charts / Visuals | Recharts (available for future analytics) |

---

## ✨ Features

### Authentication & Authorization
- Sign up with Employee ID, Email, Password, Role (Employee/HR)
- Secure password hashing (bcrypt)
- Sign in with email + password, JWT session
- Role-based access control (Admin vs Employee)

### Dashboards
- **Employee Dashboard** — quick-access cards (Profile, Attendance, Leave), recent activity
- **Admin Dashboard** — employee list, pending leave approvals, attendance overview

### Employee Profile Management
- View personal details, job details, salary, department
- Employees can edit: phone, address, profile picture
- Admins can edit: all employee fields

### Attendance Management
- Check-in / Check-out with timestamps
- Daily attendance log + visual heatmap (last 60 records)
- Status types: Present, Absent, Half-day, Leave
- Employees see only their own records; Admins see everyone's

### Leave & Time-Off Management
- Apply for leave: type (Paid / Sick / Unpaid), date range, remarks
- Status flow: Pending → Approved / Rejected
- Admin can approve/reject with comments
- **Team-conflict flag** shown to Admins automatically

### Payroll
- Employees: read-only salary view
- Admins: can view and update salary for any employee

### AI Assistant
- Floating chat widget on every dashboard
- Uses employee's real leave + attendance data as context
- Powered by Gemini 1.5 Flash

---

## 📁 Project Structure

```
dayflow-hrms/
├── backend/
│   ├── routes/
│   │   ├── auth.js          # signup, login
│   │   ├── employees.js     # profile, admin employee management
│   │   ├── attendance.js    # check-in/out, attendance records
│   │   ├── leave.js         # apply, approve/reject, conflict detection
│   │   └── assistant.js     # AI chatbot endpoint
│   ├── middleware/
│   │   └── auth.js          # JWT verification, admin guard
│   ├── db.js                 # SQLite schema + seeded admin account
│   ├── server.js              # Express app entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── EmployeeDashboard.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Attendance.jsx
│   │   │   └── Leave.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── AiAssistant.jsx
│   │   ├── api.js            # axios instance with JWT interceptor
│   │   ├── App.jsx           # routing + auth guards
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
└── README.md
```

---

## ⚙️ Setup & Run Locally

### Prerequisites
- Node.js (v18 or higher)
- npm

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd dayflow-hrms
```

### 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env
```
Open `.env` and add your Gemini API key (get a free one at [aistudio.google.com](https://aistudio.google.com)):
```
PORT=5000
JWT_SECRET=dayflow_super_secret_change_me
GEMINI_API_KEY=your_actual_key_here
```
Start the backend:
```bash
npm run dev
```
Backend runs on **http://localhost:5000**. SQLite DB is auto-created on first run, with a seeded admin account:
- **Email:** `admin@dayflow.com`
- **Password:** `Admin@123`

### 3. Frontend setup
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on **http://localhost:5173** and proxies API calls to the backend automatically.

### 4. Open the app
Visit `http://localhost:5173` → sign up as a new employee, or log in as admin using the credentials above.

---

## 🔑 Environment Variables (backend/.env)

| Variable | Description |
|---|---|
| `PORT` | Backend server port (default 5000) |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `GEMINI_API_KEY` | Google Gemini API key for the AI assistant (optional — app runs without it, AI chat just shows a setup message) |

---

## 👥 Team

| Member | Role |
|---|---|
| Arun M | Team Leader — Backend + Integration |
| Srihari Arunachalam | Frontend — Employee views |
| Aakash Murugan | Frontend — Admin views |
| Boopathi | AI Assistant + Testing + Demo |

---

## 📋 Hackathon Submission Notes

- All code kept in a **single branch** as per hackathon rules.
- Evaluator added as GitHub collaborator.
- Repo link + demo video submitted via the hackathon portal before deadline.

---

## 🔮 Future Enhancements

- Email & push notification alerts for leave approvals
- Analytics dashboard (salary slips, attendance reports as downloadable PDFs)
- Mobile app version
- Geo-tagged check-in/check-out
