import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import { useSocket } from "../utils/SocketContext";
import { StatusBadge } from "../components/StatusBadge";

export default function Queues() {
  const [queues, setQueues] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ projectId: "", name: "", priority: 0, concurrency: 5, retryPolicyId: "", rateLimitPerMinute: 0, shardKey: "" });
  const { isAdmin } = useAuth();
  const { lastEvent } = useSocket();

  const load = useCallback(() => {
    axios.get("/api/queues").then((r) => setQueues(Array.isArray(r.data) ? r.data : [])).catch(() => setQueues([]));
  }, []);

  useEffect(() => {
    load();
    axios.get("/api/projects").then((r) => setProjects(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    axios.get("/api/retry-policies").then((r) => setPolicies(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [load]);

  useEffect(() => {
    if (lastEvent?.type?.startsWith("job_")) load();
  }, [lastEvent, load]);

  const createQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post("/api/queues", {
      ...form,
      shardKey: form.shardKey || null,
    });
    setShowCreate(false);
    load();
  };

  const togglePause = async (id: string, paused: boolean) => {
    await axios.post(`/api/queues/${id}/${paused ? "resume" : "pause"}`);
    load();
  };

  const [eventType, setEventType] = useState("JOB_CREATED");
  const [eventPayload, setEventPayload] = useState('{"source":"dashboard"}');

  const subscribe = async (queueId: string) => {
    await axios.post("/api/events/subscribe", { queueId, eventType });
    load();
  };

  const publishEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post("/api/events/publish", { eventType, payload: JSON.parse(eventPayload) });
  };

  return (
    <div>
      <div className="page-header">
        <h1>Queues</h1>
        {isAdmin && <button onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "Create Queue"}</button>}
      </div>

      {showCreate && (
        <form className="card form-card" onSubmit={createQueue}>
          <label>Project
            <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} required>
              <option value="">Select project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>Name <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Priority <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></label>
          <label>Concurrency <input type="number" value={form.concurrency} onChange={(e) => setForm({ ...form, concurrency: Number(e.target.value) })} /></label>
          <label>Retry Policy
            <select value={form.retryPolicyId} onChange={(e) => setForm({ ...form, retryPolicyId: e.target.value })} required>
              <option value="">Select policy</option>
              {policies.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.strategy})</option>)}
            </select>
          </label>
          <label>Rate limit/min <input type="number" value={form.rateLimitPerMinute} onChange={(e) => setForm({ ...form, rateLimitPerMinute: Number(e.target.value) })} /></label>
          <label>Shard key <input value={form.shardKey} onChange={(e) => setForm({ ...form, shardKey: e.target.value })} placeholder="optional" /></label>
          <button type="submit">Create</button>
        </form>
      )}

      {isAdmin && (
        <div className="card form-card" style={{ maxWidth: "100%", marginBottom: "1.5rem" }}>
          <h3>Event-Driven Execution</h3>
          <form onSubmit={publishEvent} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "end" }}>
            <label>Event type <input value={eventType} onChange={(e) => setEventType(e.target.value)} /></label>
            <label>Payload <input value={eventPayload} onChange={(e) => setEventPayload(e.target.value)} style={{ minWidth: 200 }} /></label>
            <button type="submit">Publish Event</button>
          </form>
          <p className="muted">Subscribe queues to event types using the Subscribe button in the table below.</p>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Project</th>
            <th>Priority</th>
            <th>Concurrency</th>
            <th>Retry Policy</th>
            <th>Rate Limit</th>
            <th>Shard</th>
            <th>Status</th>
            <th>Stats</th>
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {queues.map((queue) => (
            <tr key={queue.id}>
              <td>{queue.name}</td>
              <td>{queue.project?.name || "—"}</td>
              <td>{queue.priority}</td>
              <td>{queue.concurrency}</td>
              <td>{queue.retryPolicy?.name} ({queue.retryPolicy?.strategy})</td>
              <td>{queue.rateLimitPerMinute || "—"}</td>
              <td>{queue.shardKey || "—"}</td>
              <td><StatusBadge status={queue.paused ? "PAUSED" : "ACTIVE"} /></td>
              <td className="stats-cell">
                Q:{queue.statistics?.totalQueued ?? 0} C:{queue.statistics?.totalCompleted ?? 0} F:{queue.statistics?.totalFailed ?? 0}
              </td>
              {isAdmin && (
                <td className="actions-cell">
                  <button onClick={() => togglePause(queue.id, queue.paused)}>
                    {queue.paused ? "Resume" : "Pause"}
                  </button>
                  <button onClick={() => subscribe(queue.id)} title={`Subscribe to ${eventType}`}>Subscribe</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
