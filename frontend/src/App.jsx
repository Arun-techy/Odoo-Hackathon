import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import EmployeeDashboard from "./pages/EmployeeDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Profile from "./pages/Profile.jsx";
import Attendance from "./pages/Attendance.jsx";
import Leave from "./pages/Leave.jsx";
import AiAssistant from "./components/AiAssistant.jsx";

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("dayflow_user"));
  } catch {
    return null;
  }
}

function ProtectedRoute({ children, adminOnly = false }) {
  const token = localStorage.getItem("dayflow_token");
  const user = getUser();
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return (
    <>
      {children}
      <AiAssistant />
    </>
  );
}

export default function App() {
  const user = getUser();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {user?.role === "admin" ? <AdminDashboard /> : <EmployeeDashboard />}
          </ProtectedRoute>
        }
      />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
      <Route path="/leave" element={<ProtectedRoute><Leave /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

