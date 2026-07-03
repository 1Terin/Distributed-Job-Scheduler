import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useSocket } from "../utils/SocketContext";
export default function DeadLetter() {
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const { lastEvent } = useSocket();
    const load = useCallback(() => {
        axios.get("/api/jobs/dead-letter", { params: { page, limit: 20 } }).then((r) => {
            setItems(r.data?.items || []);
            setTotal(r.data?.total || 0);
        }).catch(() => setItems([]));
    }, [page]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (lastEvent?.type === "job_dead_letter" || lastEvent?.type === "job_retried")
            load();
    }, [lastEvent, load]);
    const retry = async (jobId) => {
        await axios.post(`/api/jobs/${jobId}/retry`);
        load();
    };
    const totalPages = Math.ceil(total / 20) || 1;
    return (_jsxs("div", { children: [_jsx("h1", { children: "Dead Letter Queue" }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Job" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Reason" }), _jsx("th", { children: "Failed At" }), _jsx("th", { children: "Summary" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: items.map((dl) => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs(Link, { to: `/jobs/${dl.jobId}`, children: [dl.jobId.slice(0, 8), "\u2026"] }) }), _jsx("td", { children: dl.job?.type }), _jsx("td", { className: "error-text", children: dl.reason }), _jsx("td", { children: new Date(dl.failedAt).toLocaleString() }), _jsx("td", { children: dl.job?.failureSummary?.slice(0, 80) || "—" }), _jsx("td", { children: _jsx("button", { onClick: () => retry(dl.jobId), children: "Retry" }) })] }, dl.id))) })] }), _jsxs("div", { className: "pagination", children: [_jsx("button", { disabled: page <= 1, onClick: () => setPage(page - 1), children: "Prev" }), _jsxs("span", { children: ["Page ", page, " of ", totalPages, " (", total, " entries)"] }), _jsx("button", { disabled: page >= totalPages, onClick: () => setPage(page + 1), children: "Next" })] })] }));
}
