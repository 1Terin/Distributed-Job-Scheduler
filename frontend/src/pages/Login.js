import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState("admin@acme.local");
    const [password, setPassword] = useState("Password123!");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(email, password);
        }
        catch (err) {
            setError(err?.response?.data?.error || err.message || "Login failed");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "auth-page", children: _jsxs("form", { className: "auth-card", onSubmit: submit, children: [_jsx("h2", { children: "Sign in" }), _jsx("p", { className: "hint", children: "Demo: admin@acme.local / Password123!" }), _jsx("label", { htmlFor: "email", children: "Email" }), _jsx("input", { id: "email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true }), _jsx("label", { htmlFor: "password", children: "Password" }), _jsx("input", { id: "password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true }), error && _jsx("div", { className: "error", children: error }), _jsx("button", { type: "submit", disabled: loading, children: loading ? "Signing in…" : "Sign in" }), _jsxs("p", { children: ["No account? ", _jsx(Link, { to: "/register", children: "Register" })] })] }) }));
}
