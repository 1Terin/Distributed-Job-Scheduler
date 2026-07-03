import { jsx as _jsx } from "react/jsx-runtime";
const STATUS_COLORS = {
    QUEUED: "#3b82f6",
    SCHEDULED: "#8b5cf6",
    CLAIMED: "#f59e0b",
    RUNNING: "#06b6d4",
    COMPLETED: "#22c55e",
    FAILED: "#ef4444",
};
export function StatusBadge({ status }) {
    const color = STATUS_COLORS[status] || "#64748b";
    return (_jsx("span", { style: {
            background: color,
            color: "white",
            padding: "2px 8px",
            borderRadius: 6,
            fontSize: "0.8rem",
            fontWeight: 600,
        }, children: status }));
}
