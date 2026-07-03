export function connectSocket(onMessage) {
    const wsUrl = import.meta.env?.VITE_WS_URL || "ws://localhost:4000/ws";
    const ws = new WebSocket(wsUrl);
    ws.addEventListener("open", () => {
        console.log("WS connected to", wsUrl);
    });
    ws.addEventListener("message", (ev) => {
        try {
            const data = JSON.parse(ev.data);
            onMessage(data);
        }
        catch (err) {
            console.error("Invalid WS message", err);
        }
    });
    ws.addEventListener("close", () => console.log("WS closed"));
    ws.addEventListener("error", (e) => console.error("WS error", e));
    return ws;
}
export default connectSocket;
