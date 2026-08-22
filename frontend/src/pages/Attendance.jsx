import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";

const statusColor = {
  Present: "bg-green-400",
  Absent: "bg-red-400",
  "Half-day": "bg-yellow-400",
  Leave: "bg-blue-400"
};

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [msg, setMsg] = useState("");
  const user = JSON.parse(localStorage.getItem("dayflow_user") || "{}");
  const isAdmin = user.role === "admin";

  const load = () => {
    api.get("/attendance/me").then((r) => setRecords(r.data));
    if (isAdmin) api.get("/attendance").then((r) => setAllRecords(r.data));
  };

  useEffect(load, []);

  const checkIn = async () => {
    try {
      const { data } = await api.post("/attendance/check-in");
      setMsg(`Checked in at ${data.time}`);
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || "Failed");
    }
  };

  const checkOut = async () => {
    try {
      const { data } = await api.post("/attendance/check-out");
      setMsg(`Checked out at ${data.time}`);
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || "Failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Attendance</h1>

        <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6 flex items-center gap-4">
          <button onClick={checkIn} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700">
            Check In
          </button>
          <button onClick={checkOut} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200">
            Check Out
          </button>
          {msg && <span className="text-sm text-gray-500">{msg}</span>}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">My Attendance Heatmap (last records)</h2>
          <div className="flex flex-wrap gap-1.5">
            {records.slice(0, 60).reverse().map((r) => (
              <div key={r.id} title={`${r.date}: ${r.status}`}
                className={`w-5 h-5 rounded ${statusColor[r.status] || "bg-gray-200"}`} />
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            {Object.entries(statusColor).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1"><span className={`w-3 h-3 rounded ${v}`}></span>{k}</div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="px-5 py-4 border-b font-semibold text-gray-700">
            {isAdmin ? "All Employees' Attendance" : "My Attendance Log"}
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                {isAdmin && <th className="px-5 py-2">Employee</th>}
                <th className="px-5 py-2">Date</th>
                <th className="px-5 py-2">Check In</th>
                <th className="px-5 py-2">Check Out</th>
                <th className="px-5 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(isAdmin ? allRecords : records).map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  {isAdmin && <td className="px-5 py-2">{r.full_name} ({r.employee_code})</td>}
                  <td className="px-5 py-2">{r.date}</td>
                  <td className="px-5 py-2">{r.check_in || "—"}</td>
                  <td className="px-5 py-2">{r.check_out || "—"}</td>
                  <td className="px-5 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs text-white ${statusColor[r.status] || "bg-gray-400"}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
