import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("dayflow_user") || "{}");

  const logout = () => {
    localStorage.removeItem("dayflow_token");
    localStorage.removeItem("dayflow_user");
    navigate("/login");
  };

  const linkClass = "px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition";

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">D</div>
          <span className="font-bold text-lg text-gray-800">Dayflow</span>
        </div>
        <div className="flex items-center gap-1">
          <a href="/dashboard" className={linkClass}>Dashboard</a>
          <a href="/profile" className={linkClass}>Profile</a>
          <a href="/attendance" className={linkClass}>Attendance</a>
          <a href="/leave" className={linkClass}>Leave</a>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user?.full_name} ({user?.role})</span>
          <button onClick={logout} className="text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
