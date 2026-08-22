import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("dayflow_token", data.token);
      localStorage.setItem("dayflow_user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white">
      <form onSubmit={submit} className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-2">D</div>
          <h1 className="text-xl font-bold text-gray-800">Dayflow</h1>
          <p className="text-sm text-gray-500">Every workday, perfectly aligned.</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}
        <input
          type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" required
        />
        <input
          type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" required
        />
        <button className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700">
          Sign In
        </button>
        <p className="text-sm text-center text-gray-500 mt-4">
          No account? <a href="/signup" className="text-brand-600 font-medium">Sign up</a>
        </p>
        <p className="text-xs text-center text-gray-400 mt-3">
          Demo admin: admin@dayflow.com / Admin@123
        </p>
      </form>
    </div>
  );
}
