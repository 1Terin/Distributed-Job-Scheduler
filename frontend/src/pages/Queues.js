import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import { useSocket } from "../utils/SocketContext";
import { StatusBadge } from "../components/StatusBadge";
export default function Queues() {
    const [queues, setQueues] = useState([]);
    const [projects, setProjects] = useState([]);
    const [policies, setPolicies] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ projectId: "", name: "", priority: 0, concurrency: 5, retryPolicyId: "", rateLimitPerMinute: 0, shardKey: "" });
    const { isAdmin } = useAuth();
    const { lastEvent } = useSocket();
    const load = useCallback(() => {
        axios.get("/api/queues").then((r) => setQueues(Array.isArray(r.data) ? r.data : [])).catch(() => setQueues([]));
    }, []);
    useEffect(() => {
        load();
        axios.get("/api/projects").then((r) => setProjects(Array.isArray(r.data) ? r.data : [])).catch(() => { });
        axios.get("/api/retry-policies").then((r) => setPolicies(Array.isArray(r.data) ? r.data : [])).catch(() => { });
    }, [load]);
    useEffect(() => {
        if (lastEvent?.type?.startsWith("job_"))
            load();
    }, [lastEvent, load]);
    const createQueue = async (e) => {
        e.preventDefault();
        await axios.post("/api/queues", {
            ...form,
            shardKey: form.shardKey || null,
        });
        setShowCreate(false);
        load();
    };
    const togglePause = async (id, paused) => {
        await axios.post(`/api/queues/${id}/${paused ? "resume" : "pause"}`);
        load();
    };
    const [eventType, setEventType] = useState("JOB_CREATED");
    const [eventPayload, setEventPayload] = useState('{"source":"dashboard"}');
    const subscribe = async (queueId) => {
        await axios.post("/api/events/subscribe", { queueId, eventType });
        load();
    };
    const publishEvent = async (e) => {
        e.preventDefault();
        await axios.post("/api/events/publish", { eventType, payload: JSON.parse(eventPayload) });
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "page-header", children: [_jsx("h1", { children: "Queues" }), isAdmin && _jsx("button", { onClick: () => setShowCreate(!showCreate), children: showCreate ? "Cancel" : "Create Queue" })] }), showCreate && (_jsxs("form", { className: "card form-card", onSubmit: createQueue, children: [_jsxs("label", { children: ["Project", _jsxs("select", { value: form.projectId, onChange: (e) => setForm({ ...form, projectId: e.target.value }), required: true, children: [_jsx("option", { value: "", children: "Select project" }), projects.map((p) => _jsx("option", { value: p.id, children: p.name }, p.id))] })] }), _jsxs("label", { children: ["Name ", _jsx("input", { value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), required: true })] }), _jsxs("label", { children: ["Priority ", _jsx("input", { type: "number", value: form.priority, onChange: (e) => setForm({ ...form, priority: Number(e.target.value) }) })] }), _jsxs("label", { children: ["Concurrency ", _jsx("input", { type: "number", value: form.concurrency, onChange: (e) => setForm({ ...form, concurrency: Number(e.target.value) }) })] }), _jsxs("label", { children: ["Retry Policy", _jsxs("select", { value: form.retryPolicyId, onChange: (e) => setForm({ ...form, retryPolicyId: e.target.value }), required: true, children: [_jsx("option", { value: "", children: "Select policy" }), policies.map((p) => _jsxs("option", { value: p.id, children: [p.name, " (", p.strategy, ")"] }, p.id))] })] }), _jsxs("label", { children: ["Rate limit/min ", _jsx("input", { type: "number", value: form.rateLimitPerMinute, onChange: (e) => setForm({ ...form, rateLimitPerMinute: Number(e.target.value) }) })] }), _jsxs("label", { children: ["Shard key ", _jsx("input", { value: form.shardKey, onChange: (e) => setForm({ ...form, shardKey: e.target.value }), placeholder: "optional" })] }), _jsx("button", { type: "submit", children: "Create" })] })), isAdmin && (_jsxs("div", { className: "card form-card", style: { maxWidth: "100%", marginBottom: "1.5rem" }, children: [_jsx("h3", { children: "Event-Driven Execution" }), _jsxs("form", { onSubmit: publishEvent, style: { display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "end" }, children: [_jsxs("label", { children: ["Event type ", _jsx("input", { value: eventType, onChange: (e) => setEventType(e.target.value) })] }), _jsxs("label", { children: ["Payload ", _jsx("input", { value: eventPayload, onChange: (e) => setEventPayload(e.target.value), style: { minWidth: 200 } })] }), _jsx("button", { type: "submit", children: "Publish Event" })] }), _jsx("p", { className: "muted", children: "Subscribe queues to event types using the Subscribe button in the table below." })] })), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Project" }), _jsx("th", { children: "Priority" }), _jsx("th", { children: "Concurrency" }), _jsx("th", { children: "Retry Policy" }), _jsx("th", { children: "Rate Limit" }), _jsx("th", { children: "Shard" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Stats" }), isAdmin && _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: queues.map((queue) => (_jsxs("tr", { children: [_jsx("td", { children: queue.name }), _jsx("td", { children: queue.project?.name || "—" }), _jsx("td", { children: queue.priority }), _jsx("td", { children: queue.concurrency }), _jsxs("td", { children: [queue.retryPolicy?.name, " (", queue.retryPolicy?.strategy, ")"] }), _jsx("td", { children: queue.rateLimitPerMinute || "—" }), _jsx("td", { children: queue.shardKey || "—" }), _jsx("td", { children: _jsx(StatusBadge, { status: queue.paused ? "PAUSED" : "ACTIVE" }) }), _jsxs("td", { className: "stats-cell", children: ["Q:", queue.statistics?.totalQueued ?? 0, " C:", queue.statistics?.totalCompleted ?? 0, " F:", queue.statistics?.totalFailed ?? 0] }), isAdmin && (_jsxs("td", { className: "actions-cell", children: [_jsx("button", { onClick: () => togglePause(queue.id, queue.paused), children: queue.paused ? "Resume" : "Pause" }), _jsx("button", { onClick: () => subscribe(queue.id), title: `Subscribe to ${eventType}`, children: "Subscribe" })] }))] }, queue.id))) })] })] }));
}
