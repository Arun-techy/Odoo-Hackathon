import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

export default function Signup() {
  const [form, setForm] = useState({ employee_code: "", full_name: "", email: "", password: "", role: "employee" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/signup", form);
      localStorage.setItem("dayflow_token", data.token);
      localStorage.setItem("dayflow_user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white">
      <form onSubmit={submit} className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-800 text-center mb-6">Create your Dayflow account</h1>
        {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}
        <input placeholder="Employee ID" value={form.employee_code} onChange={update("employee_code")}
          className="w-full mb-3 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" required />
        <input placeholder="Full Name" value={form.full_name} onChange={update("full_name")}
          className="w-full mb-3 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" required />
        <input type="email" placeholder="Email" value={form.email} onChange={update("email")}
          className="w-full mb-3 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" required />
        <input type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={update("password")}
          className="w-full mb-3 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" required />
        <select value={form.role} onChange={update("role")}
          className="w-full mb-4 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500">
          <option value="employee">Employee</option>
          <option value="admin">HR / Admin</option>
        </select>
        <button className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700">
          Sign Up
        </button>
        <p className="text-sm text-center text-gray-500 mt-4">
          Already have an account? <a href="/login" className="text-brand-600 font-medium">Sign in</a>
        </p>
      </form>
    </div>
  );
}
