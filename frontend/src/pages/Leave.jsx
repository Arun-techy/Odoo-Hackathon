import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";

export default function Leave() {
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState({ leave_type: "Paid", start_date: "", end_date: "", remarks: "" });
  const [error, setError] = useState("");
  const user = JSON.parse(localStorage.getItem("dayflow_user") || "{}");
  const isAdmin = user.role === "admin";

  const load = () => {
    if (isAdmin) api.get("/leave").then((r) => setLeaves(r.data));
    else api.get("/leave/me").then((r) => setLeaves(r.data));
  };

  useEffect(load, []);

  const apply = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/leave", form);
      setForm({ leave_type: "Paid", start_date: "", end_date: "", remarks: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to apply");
    }
  };

  const decide = async (id, status) => {
    await api.put(`/leave/${id}`, { status });
    load();
  };

  const statusStyle = {
    Approved: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
    Pending: "bg-yellow-100 text-yellow-700"
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Leave & Time-Off</h1>

        {!isAdmin && (
          <form onSubmit={apply} className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
            <h2 className="font-semibold text-gray-700 mb-4">Apply for Leave</h2>
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-500">Leave Type</label>
                <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500">
                  <option>Paid</option><option>Sick</option><option>Unpaid</option>
                </select>
              </div>
              <div></div>
              <div>
                <label className="text-xs text-gray-500">Start Date</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" required />
              </div>
              <div>
                <label className="text-xs text-gray-500">End Date</label>
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" required />
              </div>
            </div>
            <label className="text-xs text-gray-500">Remarks</label>
            <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className="w-full mt-1 mb-4 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" rows={2} />
            <button className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700">
              Submit Request
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="px-5 py-4 border-b font-semibold text-gray-700">
            {isAdmin ? "All Leave Requests" : "My Leave Requests"}
          </div>
          <div className="divide-y">
            {leaves.map((l) => (
              <div key={l.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  {isAdmin && (
                    <p className="text-sm font-medium text-gray-700">
                      {l.full_name} ({l.employee_code})
                      {l.team_conflict && (
                        <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">⚠ Team overlap</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">{l.leave_type} · {l.start_date} → {l.end_date}</p>
                  {l.remarks && <p className="text-xs text-gray-400">"{l.remarks}"</p>}
                  {l.admin_comment && <p className="text-xs text-gray-400">Comment: {l.admin_comment}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[l.status]}`}>{l.status}</span>
                  {isAdmin && l.status === "Pending" && (
                    <>
                      <button onClick={() => decide(l.id, "Approved")}
                        className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100">Approve</button>
                      <button onClick={() => decide(l.id, "Rejected")}
                        className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100">Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {leaves.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No leave requests yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
