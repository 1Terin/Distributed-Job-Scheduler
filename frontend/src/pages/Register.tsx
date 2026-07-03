import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", name: "", organizationName: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(form.email, form.password, form.name, form.organizationName);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h2>Register</h2>
        <label>Name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <label>Password</label>
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <label>Organization</label>
        <input value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} required />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>{loading ? "Creating…" : "Register"}</button>
        <p>Have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
