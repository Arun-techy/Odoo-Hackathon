import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import "./db.js"; // initializes DB + seeds admin

import authRoutes from "./routes/auth.js";
import employeeRoutes from "./routes/employees.js";
import attendanceRoutes from "./routes/attendance.js";
import leaveRoutes from "./routes/leave.js";
import assistantRoutes from "./routes/assistant.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/assistant", assistantRoutes);

app.get("/api/health", (req, res) => res.json({ status: "Dayflow API running" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Dayflow backend running on http://localhost:${PORT}`));
