import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Queues from "./pages/Queues";
function App() {
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("header", { className: "app-header", children: [_jsx(Link, { to: "/", children: "Job Scheduler" }), _jsxs("nav", { children: [_jsx(Link, { to: "/queues", children: "Queues" }), _jsx(Link, { to: "/jobs", children: "Jobs" })] })] }), _jsx("main", { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/queues", element: _jsx(Queues, {}) }), _jsx(Route, { path: "/jobs", element: _jsx(Jobs, {}) })] }) })] }));
}
export default App;
