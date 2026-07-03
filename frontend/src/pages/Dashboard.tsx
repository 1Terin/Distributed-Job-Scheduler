import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useSocket } from "../utils/SocketContext";
import { StatusBadge } from "../components/StatusBadge";

interface QueueSummary {
  id: string;
  name: string;
  paused: boolean;
  concurrency: number;
  priority: number;
  rateLimitPerMinute: number;
  statistics?: {
    totalQueued: number;
    totalCompleted: number;
    totalFailed: number;
    totalRetried: number;
    totalDeadLetter: number;
  };
}

interface Metrics {
  jobStatusCounts: Record<string, number>;
  avgDurationMs: number;
  throughputLastHour: number;
  workers: { total: number; online: number };
}

export default function Dashboard() {
  const [queues, setQueues] = useState<QueueSummary[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const { lastEvent } = useSocket();

  const load = useCallback(() => {
    axios.get("/api/queues").then((r) => setQueues(Array.isArray(r.data) ? r.data : [])).catch(() => setQueues([]));
    axios.get("/api/workers").then((r) => setWorkers(Array.isArray(r.data) ? r.data : [])).catch(() => setWorkers([]));
    axios.get("/api/metrics").then((r) => setMetrics(r.data)).catch(() => setMetrics(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!lastEvent) return;
    const refreshTypes = ["job_created", "job_claimed", "job_running", "job_completed", "job_requeued", "job_dead_letter", "job_retried", "job_cancelled", "event_published"];
    if (refreshTypes.includes(lastEvent.type)) load();
  }, [lastEvent, load]);

  const now = Date.now();

  return (
    <div>
      <h1>Dashboard</h1>

      {metrics && (
        <section className="metrics-row">
          <div className="metric-card">
            <span className="metric-value">{metrics.throughputLastHour}</span>
            <span className="metric-label">Completed / hour</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">{metrics.avgDurationMs}ms</span>
            <span className="metric-label">Avg duration</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">{metrics.workers.online}/{metrics.workers.total}</span>
            <span className="metric-label">Workers online</span>
          </div>
          {Object.entries(metrics.jobStatusCounts).map(([status, count]) => (
            <div key={status} className="metric-card">
              <StatusBadge status={status} />
              <span className="metric-value">{count}</span>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2>Queue Health</h2>
        <div className="grid">
          {queues.map((queue) => (
            <div key={queue.id} className={`card ${queue.paused ? "paused" : ""}`}>
              <h3>{queue.name}</h3>
              <p>Status: <StatusBadge status={queue.paused ? "PAUSED" : "ACTIVE"} /></p>
              <p>Priority: {queue.priority} · Concurrency: {queue.concurrency}</p>
              <p>Rate limit: {queue.rateLimitPerMinute || "none"}/min</p>
              <div className="stats-grid">
                <span>Queued: {queue.statistics?.totalQueued ?? 0}</span>
                <span>Done: {queue.statistics?.totalCompleted ?? 0}</span>
                <span>Failed: {queue.statistics?.totalFailed ?? 0}</span>
                <span>Retried: {queue.statistics?.totalRetried ?? 0}</span>
                <span>DLQ: {queue.statistics?.totalDeadLetter ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Workers</h2>
        <div className="grid">
          {workers.map((w) => {
            const online = now - new Date(w.lastSeenAt).getTime() < 30000;
            return (
              <div key={w.id} className="card">
                <h3>{w.name} {online ? <span className="online-tag">online</span> : <span className="offline-tag">offline</span>}</h3>
                <p>Host: {w.host} · v{w.version}</p>
                <p>Last seen: {new Date(w.lastSeenAt).toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
