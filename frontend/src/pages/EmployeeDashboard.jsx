import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";

export default function EmployeeDashboard() {
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);

  useEffect(() => {
    api.get("/employees/me").then((r) => setProfile(r.data));
    api.get("/attendance/me").then((r) => setAttendance(r.data));
    api.get("/leave/me").then((r) => setLeaves(r.data));
  }, []);

  const cards = [
    { label: "Profile", href: "/profile", icon: "👤" },
    { label: "Attendance", href: "/attendance", icon: "🕒" },
    { label: "Leave Requests", href: "/leave", icon: "📝" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome back, {profile?.full_name?.split(" ")[0]} 👋</h1>
        <p className="text-gray-500 mb-6">{profile?.job_title} · {profile?.department}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {cards.map((c) => (
            <a key={c.label} href={c.href}
              className="bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md transition flex items-center gap-4">
              <div className="text-3xl">{c.icon}</div>
              <div className="font-semibold text-gray-700">{c.label}</div>
            </a>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <h2 className="font-semibold text-gray-700 mb-3">Recent Attendance</h2>
            <div className="space-y-2">
              {attendance.slice(0, 5).map((a) => (
                <div key={a.id} className="flex justify-between text-sm text-gray-600 border-b pb-2">
                  <span>{a.date}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    a.status === "Present" ? "bg-green-100 text-green-700" :
                    a.status === "Absent" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>{a.status}</span>
                </div>
              ))}
              {attendance.length === 0 && <p className="text-sm text-gray-400">No records yet.</p>}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <h2 className="font-semibold text-gray-700 mb-3">Recent Leave Requests</h2>
            <div className="space-y-2">
              {leaves.slice(0, 5).map((l) => (
                <div key={l.id} className="flex justify-between text-sm text-gray-600 border-b pb-2">
                  <span>{l.leave_type} · {l.start_date} → {l.end_date}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    l.status === "Approved" ? "bg-green-100 text-green-700" :
                    l.status === "Rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>{l.status}</span>
                </div>
              ))}
              {leaves.length === 0 && <p className="text-sm text-gray-400">No leave requests yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

