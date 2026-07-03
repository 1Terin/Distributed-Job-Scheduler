import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import { useSocket } from "../utils/SocketContext";
import { StatusBadge } from "../components/StatusBadge";
export default function JobDetails() {
    const { id } = useParams();
    const [job, setJob] = useState(null);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const { lastEvent } = useSocket();
    const load = useCallback(() => {
        if (!id)
            return;
        axios
            .get(`/api/jobs/${id}`)
            .then((res) => { setJob(res.data); setError(null); })
            .catch(() => { setJob(null); setError("Job not found"); });
    }, [id]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (lastEvent?.jobId === id)
            load();
    }, [lastEvent, id, load]);
    const retry = async () => {
        setActionLoading(true);
        try {
            await axios.post(`/api/jobs/${id}/retry`);
            load();
        }
        finally {
            setActionLoading(false);
        }
    };
    const cancel = async () => {
        setActionLoading(true);
        try {
            await axios.post(`/api/jobs/${id}/cancel`);
            load();
        }
        finally {
            setActionLoading(false);
        }
    };
    if (error)
        return _jsx("div", { className: "error", children: error });
    if (!job)
        return _jsx("div", { children: "Loading..." });
    return (_jsxs("div", { children: [_jsxs("div", { className: "page-header", children: [_jsxs("h1", { children: ["Job ", job.id.slice(0, 12), "\u2026"] }), _jsxs("div", { className: "actions", children: [(job.status === "FAILED" || job.deadLetter) && (_jsx("button", { onClick: retry, disabled: actionLoading, children: "Retry" })), ["QUEUED", "SCHEDULED", "CLAIMED", "RUNNING"].includes(job.status) && (_jsx("button", { onClick: cancel, disabled: actionLoading, className: "danger", children: "Cancel" }))] })] }), _jsxs("div", { className: "card detail-grid", children: [_jsxs("div", { children: [_jsx("strong", { children: "Type:" }), " ", job.type] }), _jsxs("div", { children: [_jsx("strong", { children: "Status:" }), " ", _jsx(StatusBadge, { status: job.status })] }), _jsxs("div", { children: [_jsx("strong", { children: "Attempt:" }), " ", job.attempt, " / ", job.maxAttempts] }), _jsxs("div", { children: [_jsx("strong", { children: "Queue:" }), " ", job.queueId] }), _jsxs("div", { children: [_jsx("strong", { children: "Priority:" }), " ", job.priority] }), _jsxs("div", { children: [_jsx("strong", { children: "Available:" }), " ", new Date(job.availableAt).toLocaleString()] }), job.scheduledAt && _jsxs("div", { children: [_jsx("strong", { children: "Scheduled:" }), " ", new Date(job.scheduledAt).toLocaleString()] }), job.recurringCron && _jsxs("div", { children: [_jsx("strong", { children: "Cron:" }), " ", job.recurringCron] }), job.claimedById && _jsxs("div", { children: [_jsx("strong", { children: "Worker:" }), " ", job.claimedById] }), job.lastError && _jsxs("div", { className: "full-width error-text", children: [_jsx("strong", { children: "Error:" }), " ", job.lastError] }), job.failureSummary && _jsxs("div", { className: "full-width", children: [_jsx("strong", { children: "Failure Summary:" }), " ", job.failureSummary] })] }), job.dependencies?.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h2", { children: "Dependencies" }), _jsx("ul", { children: job.dependencies.map((d) => (_jsxs("li", { children: [_jsxs(Link, { to: `/jobs/${d.dependsOnJob.id}`, children: [d.dependsOnJob.id.slice(0, 8), "\u2026"] }), "\u2014 ", _jsx(StatusBadge, { status: d.dependsOnJob.status })] }, d.id))) })] })), _jsx("h2", { children: "Executions" }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Attempt" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Worker" }), _jsx("th", { children: "Duration" }), _jsx("th", { children: "Started" }), _jsx("th", { children: "Error" })] }) }), _jsx("tbody", { children: (job.executions || []).map((ex) => (_jsxs("tr", { children: [_jsx("td", { children: ex.attempt }), _jsx("td", { children: _jsx(StatusBadge, { status: ex.status }) }), _jsx("td", { children: ex.workerId?.slice(0, 8) || "—" }), _jsx("td", { children: ex.durationMs ? `${ex.durationMs}ms` : "—" }), _jsx("td", { children: new Date(ex.startedAt).toLocaleString() }), _jsx("td", { children: ex.error || "—" })] }, ex.id))) })] }), _jsx("h2", { children: "Logs" }), _jsx("div", { className: "log-list", children: (job.logs || []).map((log) => (_jsxs("div", { className: `log-entry log-${log.level.toLowerCase()}`, children: [_jsx("span", { className: "log-time", children: new Date(log.createdAt).toLocaleString() }), _jsxs("span", { className: "log-level", children: ["[", log.level, "]"] }), _jsx("span", { children: log.message })] }, log.id))) }), _jsx(Link, { to: "/jobs", className: "back-link", children: "\u2190 Back to jobs" })] }));
}
