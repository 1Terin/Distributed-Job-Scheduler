import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useSocket } from "../utils/SocketContext";
import { StatusBadge } from "../components/StatusBadge";
export default function Dashboard() {
    const [queues, setQueues] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const { lastEvent } = useSocket();
    const load = useCallback(() => {
        axios.get("/api/queues").then((r) => setQueues(Array.isArray(r.data) ? r.data : [])).catch(() => setQueues([]));
        axios.get("/api/workers").then((r) => setWorkers(Array.isArray(r.data) ? r.data : [])).catch(() => setWorkers([]));
        axios.get("/api/metrics").then((r) => setMetrics(r.data)).catch(() => setMetrics(null));
    }, []);
    useEffect(() => {
        load();
    }, [load]);
    useEffect(() => {
        if (!lastEvent)
            return;
        const refreshTypes = ["job_created", "job_claimed", "job_running", "job_completed", "job_requeued", "job_dead_letter", "job_retried", "job_cancelled", "event_published"];
        if (refreshTypes.includes(lastEvent.type))
            load();
    }, [lastEvent, load]);
    const now = Date.now();
    return (_jsxs("div", { children: [_jsx("h1", { children: "Dashboard" }), metrics && (_jsxs("section", { className: "metrics-row", children: [_jsxs("div", { className: "metric-card", children: [_jsx("span", { className: "metric-value", children: metrics.throughputLastHour }), _jsx("span", { className: "metric-label", children: "Completed / hour" })] }), _jsxs("div", { className: "metric-card", children: [_jsxs("span", { className: "metric-value", children: [metrics.avgDurationMs, "ms"] }), _jsx("span", { className: "metric-label", children: "Avg duration" })] }), _jsxs("div", { className: "metric-card", children: [_jsxs("span", { className: "metric-value", children: [metrics.workers.online, "/", metrics.workers.total] }), _jsx("span", { className: "metric-label", children: "Workers online" })] }), Object.entries(metrics.jobStatusCounts).map(([status, count]) => (_jsxs("div", { className: "metric-card", children: [_jsx(StatusBadge, { status: status }), _jsx("span", { className: "metric-value", children: count })] }, status)))] })), _jsxs("section", { children: [_jsx("h2", { children: "Queue Health" }), _jsx("div", { className: "grid", children: queues.map((queue) => (_jsxs("div", { className: `card ${queue.paused ? "paused" : ""}`, children: [_jsx("h3", { children: queue.name }), _jsxs("p", { children: ["Status: ", _jsx(StatusBadge, { status: queue.paused ? "PAUSED" : "ACTIVE" })] }), _jsxs("p", { children: ["Priority: ", queue.priority, " \u00B7 Concurrency: ", queue.concurrency] }), _jsxs("p", { children: ["Rate limit: ", queue.rateLimitPerMinute || "none", "/min"] }), _jsxs("div", { className: "stats-grid", children: [_jsxs("span", { children: ["Queued: ", queue.statistics?.totalQueued ?? 0] }), _jsxs("span", { children: ["Done: ", queue.statistics?.totalCompleted ?? 0] }), _jsxs("span", { children: ["Failed: ", queue.statistics?.totalFailed ?? 0] }), _jsxs("span", { children: ["Retried: ", queue.statistics?.totalRetried ?? 0] }), _jsxs("span", { children: ["DLQ: ", queue.statistics?.totalDeadLetter ?? 0] })] })] }, queue.id))) })] }), _jsxs("section", { children: [_jsx("h2", { children: "Workers" }), _jsx("div", { className: "grid", children: workers.map((w) => {
                            const online = now - new Date(w.lastSeenAt).getTime() < 30000;
                            return (_jsxs("div", { className: "card", children: [_jsxs("h3", { children: [w.name, " ", online ? _jsx("span", { className: "online-tag", children: "online" }) : _jsx("span", { className: "offline-tag", children: "offline" })] }), _jsxs("p", { children: ["Host: ", w.host, " \u00B7 v", w.version] }), _jsxs("p", { children: ["Last seen: ", new Date(w.lastSeenAt).toLocaleString()] })] }, w.id));
                        }) })] })] }));
}
