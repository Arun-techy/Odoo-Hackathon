import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";

const db = new DatabaseSync("dayflow.db");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  phone TEXT,
  address TEXT,
  job_title TEXT,
  department TEXT,
  salary REAL DEFAULT 0,
  profile_picture TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  status TEXT DEFAULT 'Present',
  FOREIGN KEY(user_id) REFERENCES users(id),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  remarks TEXT,
  status TEXT DEFAULT 'Pending',
  admin_comment TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

const adminExists = db.prepare("SELECT * FROM users WHERE email = ?").get("admin@dayflow.com");
if (!adminExists) {
  const hashed = bcrypt.hashSync("Admin@123", 10);
  db.prepare(`
    INSERT INTO users (employee_code, full_name, email, password, role, job_title, department, salary)
    VALUES (?, ?, ?, ?, 'admin', ?, ?, ?)
  `).run("EMP001", "Admin User", "admin@dayflow.com", hashed, "HR Manager", "Human Resources", 60000);
  console.log("Seeded default admin -> email: admin@dayflow.com | password: Admin@123");
}

export default db;