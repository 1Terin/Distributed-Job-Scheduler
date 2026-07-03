import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import axios from "axios";
export default function Projects() {
    const [projects, setProjects] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const load = () => {
        axios.get("/api/projects").then((r) => setProjects(Array.isArray(r.data) ? r.data : [])).catch(() => setProjects([]));
    };
    useEffect(() => { load(); }, []);
    const create = async (e) => {
        e.preventDefault();
        await axios.post("/api/projects", { name, description });
        setShowCreate(false);
        setName("");
        setDescription("");
        load();
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "page-header", children: [_jsx("h1", { children: "Projects" }), _jsx("button", { onClick: () => setShowCreate(!showCreate), children: showCreate ? "Cancel" : "Create Project" })] }), showCreate && (_jsxs("form", { className: "card form-card", onSubmit: create, children: [_jsxs("label", { children: ["Name ", _jsx("input", { value: name, onChange: (e) => setName(e.target.value), required: true })] }), _jsxs("label", { children: ["Description ", _jsx("input", { value: description, onChange: (e) => setDescription(e.target.value) })] }), _jsx("button", { type: "submit", children: "Create" })] })), _jsx("div", { className: "grid", children: projects.map((p) => (_jsxs("div", { className: "card", children: [_jsx("h3", { children: p.name }), _jsx("p", { children: p.description || "No description" }), _jsxs("p", { children: ["Queues: ", p._count?.queues ?? 0, " \u00B7 Jobs: ", p._count?.jobs ?? 0] }), _jsxs("p", { className: "muted", children: ["Created ", new Date(p.createdAt).toLocaleDateString()] })] }, p.id))) })] }));
}
