import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Queues from "./pages/Queues";
import JobDetails from "./pages/JobDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Projects from "./pages/Projects";
import Workers from "./pages/Workers";
import DeadLetter from "./pages/DeadLetter";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { SocketProvider, useSocket } from "./utils/SocketContext";
import ProtectedRoute from "./components/ProtectedRoute";
function AppShell() {
    const { token, user, logout } = useAuth();
    const { lastEvent, connected } = useSocket();
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("header", { className: "app-header", children: [_jsx(Link, { to: "/", className: "brand", children: "Job Scheduler" }), _jsxs("nav", { children: [_jsx(Link, { to: "/", children: "Dashboard" }), _jsx(Link, { to: "/projects", children: "Projects" }), _jsx(Link, { to: "/queues", children: "Queues" }), _jsx(Link, { to: "/jobs", children: "Jobs" }), _jsx(Link, { to: "/dead-letter", children: "DLQ" }), _jsx(Link, { to: "/workers", children: "Workers" }), token ? (_jsxs("span", { className: "auth-area", children: [_jsxs("span", { className: "user-badge", children: [user?.name, " (", user?.role, ")"] }), _jsx("span", { className: `ws-dot ${connected ? "online" : "offline"}`, title: connected ? "Live" : "Disconnected" }), _jsx("button", { onClick: logout, children: "Sign out" })] })) : (_jsx(Link, { to: "/login", children: "Sign in" }))] })] }), lastEvent && (_jsxs("div", { className: "live-bar", children: ["Live: ", _jsx("strong", { children: lastEvent.type }), lastEvent.jobId ? ` — job ${String(lastEvent.jobId).slice(0, 8)}…` : ""] })), _jsx("main", { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: token ? _jsx(Navigate, { to: "/" }) : _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: token ? _jsx(Navigate, { to: "/" }) : _jsx(Register, {}) }), _jsx(Route, { path: "/", element: _jsx(ProtectedRoute, { children: _jsx(Dashboard, {}) }) }), _jsx(Route, { path: "/projects", element: _jsx(ProtectedRoute, { children: _jsx(Projects, {}) }) }), _jsx(Route, { path: "/queues", element: _jsx(ProtectedRoute, { children: _jsx(Queues, {}) }) }), _jsx(Route, { path: "/jobs", element: _jsx(ProtectedRoute, { children: _jsx(Jobs, {}) }) }), _jsx(Route, { path: "/jobs/:id", element: _jsx(ProtectedRoute, { children: _jsx(JobDetails, {}) }) }), _jsx(Route, { path: "/dead-letter", element: _jsx(ProtectedRoute, { children: _jsx(DeadLetter, {}) }) }), _jsx(Route, { path: "/workers", element: _jsx(ProtectedRoute, { children: _jsx(Workers, {}) }) })] }) })] }));
}
function App() {
    return (_jsx(AuthProvider, { children: _jsx(SocketProvider, { children: _jsx(AppShell, {}) }) }));
}
export default App;
