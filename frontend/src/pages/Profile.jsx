import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/employees/me").then((r) => setProfile(r.data));
  }, []);

  const save = async () => {
    await api.put("/employees/me", {
      phone: profile.phone,
      address: profile.address,
      profile_picture: profile.profile_picture
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h1>
        <div className="bg-white rounded-2xl p-6 shadow-sm border space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">Employee ID</label>
              <p className="font-medium text-gray-700">{profile.employee_code}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Full Name</label>
              <p className="font-medium text-gray-700">{profile.full_name}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Email</label>
              <p className="font-medium text-gray-700">{profile.email}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Job Title</label>
              <p className="font-medium text-gray-700">{profile.job_title || "—"}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Department</label>
              <p className="font-medium text-gray-700">{profile.department || "—"}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Salary (read-only)</label>
              <p className="font-medium text-gray-700">₹{profile.salary?.toLocaleString() || 0}</p>
            </div>
          </div>

          <hr />
          <p className="text-sm font-semibold text-gray-600">Editable details</p>
          <div>
            <label className="text-xs text-gray-500">Phone</label>
            <input
              value={profile.phone || ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Address</label>
            <input
              value={profile.address || ""}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button onClick={save} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700">
            Save Changes
          </button>
          {saved && <span className="ml-3 text-sm text-green-600">Saved ✓</span>}
        </div>
      </div>
    </div>
  );
}
