import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useSocket } from "../utils/SocketContext";

export default function Workers() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [heartbeats, setHeartbeats] = useState<any[]>([]);
  const { lastEvent } = useSocket();

  const load = useCallback(() => {
    axios.get("/api/workers").then((r) => setWorkers(Array.isArray(r.data) ? r.data : [])).catch(() => setWorkers([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (lastEvent?.type === "job_claimed" || lastEvent?.type === "job_running") load();
  }, [lastEvent, load]);

  const selectWorker = async (id: string) => {
    const res = await axios.get(`/api/workers/${id}`);
    setSelected(res.data.worker);
    setHeartbeats(res.data.heartbeats || []);
  };

  const now = Date.now();

  return (
    <div>
      <h1>Workers</h1>
      <div className="worker-layout">
        <div className="grid">
          {workers.map((w) => {
            const online = now - new Date(w.lastSeenAt).getTime() < 30000;
            return (
              <div key={w.id} className={`card clickable ${selected?.id === w.id ? "selected" : ""}`} onClick={() => selectWorker(w.id)}>
                <h3>{w.name}</h3>
                <p>{online ? <span className="online-tag">online</span> : <span className="offline-tag">offline</span>}</p>
                <p>Host: {w.host}</p>
                <p>Version: {w.version}</p>
                <p>Last seen: {new Date(w.lastSeenAt).toLocaleString()}</p>
              </div>
            );
          })}
        </div>

        {selected && (
          <div className="card heartbeat-panel">
            <h3>Heartbeats — {selected.name}</h3>
            <table>
              <thead><tr><th>Time</th><th>Healthy</th><th>Details</th></tr></thead>
              <tbody>
                {heartbeats.map((hb) => (
                  <tr key={hb.id}>
                    <td>{new Date(hb.createdAt).toLocaleString()}</td>
                    <td>{hb.healthy ? "✓" : "✗"}</td>
                    <td>{hb.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
