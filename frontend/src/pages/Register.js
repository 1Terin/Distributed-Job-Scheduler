import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
export default function Register() {
    const { register } = useAuth();
    const [form, setForm] = useState({ email: "", password: "", name: "", organizationName: "" });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await register(form.email, form.password, form.name, form.organizationName);
        }
        catch (err) {
            setError(err?.response?.data?.error || err.message || "Registration failed");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "auth-page", children: _jsxs("form", { className: "auth-card", onSubmit: submit, children: [_jsx("h2", { children: "Register" }), _jsx("label", { children: "Name" }), _jsx("input", { value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), required: true }), _jsx("label", { children: "Email" }), _jsx("input", { type: "email", value: form.email, onChange: (e) => setForm({ ...form, email: e.target.value }), required: true }), _jsx("label", { children: "Password" }), _jsx("input", { type: "password", value: form.password, onChange: (e) => setForm({ ...form, password: e.target.value }), required: true }), _jsx("label", { children: "Organization" }), _jsx("input", { value: form.organizationName, onChange: (e) => setForm({ ...form, organizationName: e.target.value }), required: true }), error && _jsx("div", { className: "error", children: error }), _jsx("button", { type: "submit", disabled: loading, children: loading ? "Creating…" : "Register" }), _jsxs("p", { children: ["Have an account? ", _jsx(Link, { to: "/login", children: "Sign in" })] })] }) }));
}
