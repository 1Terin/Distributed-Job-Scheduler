import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useSocket } from "../utils/SocketContext";
export default function Workers() {
    const [workers, setWorkers] = useState([]);
    const [selected, setSelected] = useState(null);
    const [heartbeats, setHeartbeats] = useState([]);
    const { lastEvent } = useSocket();
    const load = useCallback(() => {
        axios.get("/api/workers").then((r) => setWorkers(Array.isArray(r.data) ? r.data : [])).catch(() => setWorkers([]));
    }, []);
    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (lastEvent?.type === "job_claimed" || lastEvent?.type === "job_running")
            load();
    }, [lastEvent, load]);
    const selectWorker = async (id) => {
        const res = await axios.get(`/api/workers/${id}`);
        setSelected(res.data.worker);
        setHeartbeats(res.data.heartbeats || []);
    };
    const now = Date.now();
    return (_jsxs("div", { children: [_jsx("h1", { children: "Workers" }), _jsxs("div", { className: "worker-layout", children: [_jsx("div", { className: "grid", children: workers.map((w) => {
                            const online = now - new Date(w.lastSeenAt).getTime() < 30000;
                            return (_jsxs("div", { className: `card clickable ${selected?.id === w.id ? "selected" : ""}`, onClick: () => selectWorker(w.id), children: [_jsx("h3", { children: w.name }), _jsx("p", { children: online ? _jsx("span", { className: "online-tag", children: "online" }) : _jsx("span", { className: "offline-tag", children: "offline" }) }), _jsxs("p", { children: ["Host: ", w.host] }), _jsxs("p", { children: ["Version: ", w.version] }), _jsxs("p", { children: ["Last seen: ", new Date(w.lastSeenAt).toLocaleString()] })] }, w.id));
                        }) }), selected && (_jsxs("div", { className: "card heartbeat-panel", children: [_jsxs("h3", { children: ["Heartbeats \u2014 ", selected.name] }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Time" }), _jsx("th", { children: "Healthy" }), _jsx("th", { children: "Details" })] }) }), _jsx("tbody", { children: heartbeats.map((hb) => (_jsxs("tr", { children: [_jsx("td", { children: new Date(hb.createdAt).toLocaleString() }), _jsx("td", { children: hb.healthy ? "✓" : "✗" }), _jsx("td", { children: hb.details })] }, hb.id))) })] })] }))] })] }));
}
