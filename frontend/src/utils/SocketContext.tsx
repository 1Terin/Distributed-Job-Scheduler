import { createContext, useContext, useEffect, useRef, useState } from "react";

type SocketEvent = { type: string; [key: string]: unknown };

type SocketContextType = {
  lastEvent: SocketEvent | null;
  connected: boolean;
};

const SocketContext = createContext<SocketContextType>({ lastEvent: null, connected: false });

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [lastEvent, setLastEvent] = useState<SocketEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = (import.meta as any).env?.VITE_WS_URL || `${protocol}//${window.location.host}/ws`;
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
        } catch {
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

  return <SocketContext.Provider value={{ lastEvent, connected }}>{children}</SocketContext.Provider>;
}
