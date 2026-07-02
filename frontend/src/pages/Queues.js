import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import axios from "axios";
export default function Queues() {
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
    return (_jsxs("div", { children: [_jsx("h1", { children: "Queues" }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Priority" }), _jsx("th", { children: "Concurrency" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: queues.map((queue) => (_jsxs("tr", { children: [_jsx("td", { children: queue.name }), _jsx("td", { children: queue.priority }), _jsx("td", { children: queue.concurrency }), _jsx("td", { children: queue.paused ? "Paused" : "Active" })] }, queue.id))) })] })] }));
}
