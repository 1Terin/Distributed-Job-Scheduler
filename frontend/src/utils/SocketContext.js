import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useRef, useState } from "react";
const SocketContext = createContext({ lastEvent: null, connected: false });
export function useSocket() {
    return useContext(SocketContext);
}
export function SocketProvider({ children }) {
    const [lastEvent, setLastEvent] = useState(null);
    const [connected, setConnected] = useState(false);
    const wsRef = useRef(null);
    const retryRef = useRef();
    useEffect(() => {
        const connect = () => {
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const wsUrl = import.meta.env?.VITE_WS_URL || `${protocol}//${window.location.host}/ws`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            ws.onopen = () => setConnected(true);
            ws.onclose = () => {
                setConnected(false);
                retryRef.current = setTimeout(connect, 3000);
            };
            ws.onerror = () => ws.close();
            ws.onmessage = (ev) => {
                try {
                    setLastEvent(JSON.parse(ev.data));
                }
                catch {
                    /* ignore */
                }
            };
        };
        connect();
        return () => {
            clearTimeout(retryRef.current);
            wsRef.current?.close();
        };
    }, []);
    return _jsx(SocketContext.Provider, { value: { lastEvent, connected }, children: children });
}
