# Dayflow HRMS — Backend

> **Odoo × NMIT Bangalore Hackathon 2026**
> Node.js + Express + SQLite (sql.js, pure JavaScript — no native compilation needed on Windows)

---

## Quick Start

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Create your .env file
copy .env.example .env
#    Then open .env and set your GEMINI_API_KEY

# 3. Start development server (auto-restarts on changes)
npm run dev

# OR start production server
npm start
```

The server starts on **http://localhost:5000** (or whatever `PORT` you set in `.env`).

On first run it auto-creates `dayflow.db` and seeds a default admin:

| Field    | Value                |
|----------|----------------------|
| Email    | admin@dayflow.com    |
| Password | Admin@123            |
| Role     | admin                |

---

## Tech Stack

| Layer      | Library                              |
|------------|--------------------------------------|
| Framework  | Express.js 4                         |
| Database   | sql.js 1.x (SQLite via pure JS/WASM) |
| Auth       | jsonwebtoken + bcryptjs              |
| AI         | Google Gemini 1.5 Flash              |
| Config     | dotenv                               |
| CORS       | cors                                 |

> **Why sql.js?**  
> `better-sqlite3` requires C++ compilation (node-gyp / Visual Studio Build Tools).  
> `sql.js` is compiled SQLite running as a pure-JavaScript/WASM module — zero native build needed.

---

## API Reference

### Authentication header (all protected routes)
```
Authorization: Bearer <token>
```

---

### 🔓 Auth — `/api/auth` (public)

| Method | Route     | Body                                            | Returns              |
|--------|-----------|-------------------------------------------------|----------------------|
| POST   | /signup   | `name`, `email`, `password`, `department?`, `phone?` | `{ token, user }`  |
| POST   | /login    | `email`, `password`                             | `{ token, user }`   |

**Signup example:**
```json
POST /api/auth/signup
{
  "name": "Jane Doe",
  "email": "jane@company.com",
  "password": "Secret@123",
  "department": "Engineering"
}
```

---

### 👤 Employees — `/api/employees` (JWT required)

| Method | Route          | Access     | Body                                   |
|--------|----------------|------------|----------------------------------------|
| GET    | /              | Admin      | —                                      |
| GET    | /me            | Any        | —                                      |
| GET    | /:id           | Admin      | —                                      |
| PUT    | /me            | Any        | `phone?`, `address?`                   |
| PUT    | /:id           | Admin      | `name?`, `department?`, `phone?`, `address?` |
| PUT    | /:id/salary    | Admin      | `{ salary }`                           |

---

### 📅 Attendance — `/api/attendance` (JWT required)

| Method | Route       | Access     | Description                                        |
|--------|-------------|------------|----------------------------------------------------|
| POST   | /checkin    | Any        | Mark check-in for today (error if already done)    |
| POST   | /checkout   | Any        | Mark check-out (error if not checked in yet)       |
| GET    | /           | Any        | Own attendance history (newest first, for heatmap) |
| GET    | /today      | Any        | Today's check-in/out status                        |
| GET    | /:userId    | Admin      | Any employee's attendance history                  |

**Checkin response:**
```json
{ "message": "Checked in successfully", "check_in": "2026-08-22T09:45:00.000Z", "status": "on-time" }
```

---

### 🏖️ Leave — `/api/leave` (JWT required)

| Method | Route              | Access     | Body / Notes                                                   |
|--------|--------------------|------------|----------------------------------------------------------------|
| POST   | /apply             | Any        | `type` (Paid/Sick/Unpaid), `start_date`, `end_date`, `reason?` |
| GET    | /                  | Any        | Own leaves. Admin: add `?all=true` for all employees           |
| GET    | /:id/conflicts     | Admin      | Detect overlapping leaves in same department                   |
| PUT    | /:id/approve       | Admin      | Approve leave request                                          |
| PUT    | /:id/reject        | Admin      | Reject leave request                                           |

**Conflict detection response:**
```json
{
  "hasConflict": true,
  "requestedLeave": { "id": 3, "employee": "Jane", "department": "Engineering", ... },
  "conflicts": [
    { "id": 1, "employee_name": "Bob", "start_date": "2026-08-20", "end_date": "2026-08-25", "status": "Approved" }
  ]
}
```

---

### 🤖 AI Assistant — `/api/assistant` (JWT required)

| Method | Route  | Body              | Returns          |
|--------|--------|-------------------|------------------|
| POST   | /chat  | `{ message }`     | `{ reply }`      |

The assistant automatically fetches the logged-in employee's real leave and attendance records, combines them with Dayflow's HR policy, and sends everything to **Gemini 1.5 Flash** so replies are personalised to the employee's actual data.

**Example:**
```json
POST /api/assistant/chat
{ "message": "How many paid leave days do I have left this year?" }

// Response:
{ "reply": "Based on your records, you've used 3 of your 12 paid leave days this year, so you have approximately 9 days remaining. ..." }
```

> Requires `GEMINI_API_KEY` to be set in `.env`. Get a free key at https://aistudio.google.com

---

## Database Schema

```sql
users (
  id, name, email UNIQUE, password (bcrypt),
  role ('employee'|'admin'), department,
  phone, address, salary, created_at
)

attendance (
  id, user_id FK, date YYYY-MM-DD,
  check_in (ISO), check_out (ISO),
  UNIQUE(user_id, date)
)

leaves (
  id, user_id FK, type ('Paid'|'Sick'|'Unpaid'),
  start_date, end_date, reason,
  status ('Pending'|'Approved'|'Rejected'), created_at
)
```

---

## Security Notes

- Passwords are **always bcrypt-hashed** (cost factor 10); plaintext is never stored.
- All protected routes require a valid, non-expired JWT (`Authorization: Bearer <token>`).
- Admin-only routes return **403** for employee-role tokens.
- Required fields missing → **400** with a descriptive error message.
- All DB queries use **parameterised statements** (sql.js prepared statements) — no SQL injection possible.

---

## Error Codes

| Code | Meaning                                      |
|------|----------------------------------------------|
| 400  | Bad request — missing/invalid field          |
| 401  | Unauthorised — missing or invalid token      |
| 403  | Forbidden — insufficient role                |
| 404  | Resource not found                           |
| 502  | Gemini API error (check your API key)        |
| 500  | Unexpected server error                      |
