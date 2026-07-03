import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useSocket } from "../utils/SocketContext";
import { StatusBadge } from "../components/StatusBadge";
export default function Jobs() {
    const [jobs, setJobs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState("");
    const [queues, setQueues] = useState([]);
    const [queueId, setQueueId] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ queueId: "", type: "IMMEDIATE", payload: '{"task":"example"}', scheduledAt: "", recurringCron: "", dependsOnIds: "" });
    const { lastEvent } = useSocket();
    const load = useCallback(() => {
        const params = { page, limit: 20 };
        if (status)
            params.status = status;
        if (queueId)
            params.queueId = queueId;
        axios.get("/api/jobs", { params }).then((r) => {
            setJobs(r.data?.items || []);
            setTotal(r.data?.total || 0);
        }).catch(() => setJobs([]));
    }, [page, status, queueId]);
    useEffect(() => {
        axios.get("/api/queues").then((r) => setQueues(Array.isArray(r.data) ? r.data : [])).catch(() => { });
        load();
    }, [load]);
    useEffect(() => {
        if (!lastEvent)
            return;
        if (["job_created", "job_claimed", "job_running", "job_completed", "job_requeued", "job_dead_letter", "job_retried", "job_cancelled"].includes(lastEvent.type)) {
            load();
        }
    }, [lastEvent, load]);
    const createJob = async (e) => {
        e.preventDefault();
        const body = {
            queueId: form.queueId,
            type: form.type,
            payload: JSON.parse(form.payload),
        };
        if (form.type === "DELAYED" || form.type === "SCHEDULED")
            body.scheduledAt = form.scheduledAt;
        if (form.type === "RECURRING") {
            body.recurringCron = form.recurringCron;
            body.scheduledAt = form.scheduledAt || new Date().toISOString();
            body.type = "RECURRING";
        }
        if (form.dependsOnIds.trim()) {
            body.dependsOnIds = form.dependsOnIds.split(",").map((s) => s.trim()).filter(Boolean);
        }
        await axios.post("/api/jobs", body);
        setShowCreate(false);
        load();
    };
    const totalPages = Math.ceil(total / 20) || 1;
    return (_jsxs("div", { children: [_jsxs("div", { className: "page-header", children: [_jsx("h1", { children: "Jobs" }), _jsx("button", { onClick: () => setShowCreate(!showCreate), children: showCreate ? "Cancel" : "Create Job" })] }), showCreate && (_jsxs("form", { className: "card form-card", onSubmit: createJob, children: [_jsxs("label", { children: ["Queue", _jsxs("select", { value: form.queueId, onChange: (e) => setForm({ ...form, queueId: e.target.value }), required: true, children: [_jsx("option", { value: "", children: "Select queue" }), queues.map((q) => _jsx("option", { value: q.id, children: q.name }, q.id))] })] }), _jsxs("label", { children: ["Type", _jsxs("select", { value: form.type, onChange: (e) => setForm({ ...form, type: e.target.value }), children: [_jsx("option", { value: "IMMEDIATE", children: "Immediate" }), _jsx("option", { value: "DELAYED", children: "Delayed" }), _jsx("option", { value: "SCHEDULED", children: "Scheduled" }), _jsx("option", { value: "RECURRING", children: "Recurring (cron)" }), _jsx("option", { value: "BATCH", children: "Batch" })] })] }), (form.type === "DELAYED" || form.type === "SCHEDULED" || form.type === "RECURRING") && (_jsxs("label", { children: ["Scheduled At", _jsx("input", { type: "datetime-local", value: form.scheduledAt, onChange: (e) => setForm({ ...form, scheduledAt: e.target.value }), required: true })] })), form.type === "RECURRING" && (_jsxs("label", { children: ["Cron Expression", _jsx("input", { value: form.recurringCron, onChange: (e) => setForm({ ...form, recurringCron: e.target.value }), placeholder: "*/5 * * * *", required: true })] })), _jsxs("label", { children: ["Payload (JSON)", _jsx("textarea", { value: form.payload, onChange: (e) => setForm({ ...form, payload: e.target.value }), rows: 3 })] }), _jsxs("label", { children: ["Depends on job IDs (comma-separated, optional)", _jsx("input", { value: form.dependsOnIds, onChange: (e) => setForm({ ...form, dependsOnIds: e.target.value }), placeholder: "uuid1, uuid2" })] }), _jsx("button", { type: "submit", children: "Submit" })] })), _jsxs("div", { className: "filters", children: [_jsxs("select", { value: status, onChange: (e) => { setStatus(e.target.value); setPage(1); }, children: [_jsx("option", { value: "", children: "All statuses" }), ["QUEUED", "SCHEDULED", "CLAIMED", "RUNNING", "COMPLETED", "FAILED"].map((s) => (_jsx("option", { value: s, children: s }, s)))] }), _jsxs("select", { value: queueId, onChange: (e) => { setQueueId(e.target.value); setPage(1); }, children: [_jsx("option", { value: "", children: "All queues" }), queues.map((q) => _jsx("option", { value: q.id, children: q.name }, q.id))] })] }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Queue" }), _jsx("th", { children: "Priority" }), _jsx("th", { children: "Attempt" })] }) }), _jsx("tbody", { children: jobs.map((job) => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs(Link, { to: `/jobs/${job.id}`, children: [job.id.slice(0, 8), "\u2026"] }) }), _jsx("td", { children: job.type }), _jsx("td", { children: _jsx(StatusBadge, { status: job.status }) }), _jsx("td", { children: queues.find((q) => q.id === job.queueId)?.name || job.queueId.slice(0, 8) }), _jsx("td", { children: job.priority }), _jsxs("td", { children: [job.attempt, "/", job.maxAttempts] })] }, job.id))) })] }), _jsxs("div", { className: "pagination", children: [_jsx("button", { disabled: page <= 1, onClick: () => setPage(page - 1), children: "Prev" }), _jsxs("span", { children: ["Page ", page, " of ", totalPages, " (", total, " jobs)"] }), _jsx("button", { disabled: page >= totalPages, onClick: () => setPage(page + 1), children: "Next" })] })] }));
}
