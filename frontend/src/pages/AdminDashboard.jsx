import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);

  useEffect(() => {
    api.get("/employees").then((r) => setEmployees(r.data));
    api.get("/leave").then((r) => setPendingLeaves(r.data.filter((l) => l.status === "Pending")));
  }, []);

  const decide = async (id, status) => {
    await api.put(`/leave/${id}`, { status });
    setPendingLeaves((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">HR / Admin Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Total Employees</p>
            <p className="text-3xl font-bold text-brand-700">{employees.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Pending Leave Requests</p>
            <p className="text-3xl font-bold text-yellow-600">{pendingLeaves.length}</p>
          </div>
          <a href="/attendance" className="bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md transition">
            <p className="text-sm text-gray-500">Attendance Records</p>
            <p className="text-3xl font-bold text-brand-700">View →</p>
          </a>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="px-5 py-4 border-b font-semibold text-gray-700">Pending Leave Approvals</div>
          <div className="divide-y">
            {pendingLeaves.map((l) => (
              <div key={l.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {l.full_name} <span className="text-gray-400">({l.employee_code})</span>
                    {l.team_conflict && (
                      <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        ⚠ Team overlap
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{l.leave_type} · {l.start_date} → {l.end_date}</p>
                  {l.remarks && <p className="text-xs text-gray-400">"{l.remarks}"</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => decide(l.id, "Approved")}
                    className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100">Approve</button>
                  <button onClick={() => decide(l.id, "Rejected")}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100">Reject</button>
                </div>
              </div>
            ))}
            {pendingLeaves.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No pending requests 🎉</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="px-5 py-4 border-b font-semibold text-gray-700">Employees</div>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="px-5 py-2">Code</th>
                <th className="px-5 py-2">Name</th>
                <th className="px-5 py-2">Department</th>
                <th className="px-5 py-2">Role</th>
                <th className="px-5 py-2">Salary</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="px-5 py-2">{e.employee_code}</td>
                  <td className="px-5 py-2">{e.full_name}</td>
                  <td className="px-5 py-2">{e.department || "—"}</td>
                  <td className="px-5 py-2 capitalize">{e.role}</td>
                  <td className="px-5 py-2">₹{e.salary?.toLocaleString() || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

