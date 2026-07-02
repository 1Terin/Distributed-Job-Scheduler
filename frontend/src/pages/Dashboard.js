import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import axios from "axios";
export default function Dashboard() {
    const [queues, setQueues] = useState([]);
    useEffect(() => {
        axios
            .get("/api/queues")
            .then((response) => setQueues(Array.isArray(response.data) ? response.data : []))
            .catch((error) => {
            console.error(error);
            setQueues([]);
        });
    }, []);
    return (_jsxs("div", { children: [_jsx("h1", { children: "Dashboard" }), _jsxs("section", { children: [_jsx("h2", { children: "Queue Health" }), _jsx("div", { className: "grid", children: queues.map((queue) => (_jsxs("div", { className: "card", children: [_jsx("h3", { children: queue.name }), _jsxs("p", { children: ["Status: ", queue.paused ? "Paused" : "Active"] }), _jsxs("p", { children: ["Priority: ", queue.priority] }), _jsxs("p", { children: ["Concurrency: ", queue.concurrency] }), _jsxs("p", { children: ["Queued: ", queue.statistics?.totalQueued ?? 0] }), _jsxs("p", { children: ["Completed: ", queue.statistics?.totalCompleted ?? 0] }), _jsxs("p", { children: ["Failed: ", queue.statistics?.totalFailed ?? 0] })] }, queue.id))) })] })] }));
}
