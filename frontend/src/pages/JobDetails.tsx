import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import { useSocket } from "../utils/SocketContext";
import { StatusBadge } from "../components/StatusBadge";

export default function JobDetails() {
  const { id } = useParams();
  const [job, setJob] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { lastEvent } = useSocket();

  const load = useCallback(() => {
    if (!id) return;
    axios
      .get(`/api/jobs/${id}`)
      .then((res) => { setJob(res.data); setError(null); })
      .catch(() => { setJob(null); setError("Job not found"); });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (lastEvent?.jobId === id) load();
  }, [lastEvent, id, load]);

  const retry = async () => {
    setActionLoading(true);
    try {
      await axios.post(`/api/jobs/${id}/retry`);
      load();
    } finally {
      setActionLoading(false);
    }
  };

  const cancel = async () => {
    setActionLoading(true);
    try {
      await axios.post(`/api/jobs/${id}/cancel`);
      load();
    } finally {
      setActionLoading(false);
    }
  };

  if (error) return <div className="error">{error}</div>;
  if (!job) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Job {job.id.slice(0, 12)}…</h1>
        <div className="actions">
          {(job.status === "FAILED" || job.deadLetter) && (
            <button onClick={retry} disabled={actionLoading}>Retry</button>
          )}
          {["QUEUED", "SCHEDULED", "CLAIMED", "RUNNING"].includes(job.status) && (
            <button onClick={cancel} disabled={actionLoading} className="danger">Cancel</button>
          )}
        </div>
      </div>

      <div className="card detail-grid">
        <div><strong>Type:</strong> {job.type}</div>
        <div><strong>Status:</strong> <StatusBadge status={job.status} /></div>
        <div><strong>Attempt:</strong> {job.attempt} / {job.maxAttempts}</div>
        <div><strong>Queue:</strong> {job.queueId}</div>
        <div><strong>Priority:</strong> {job.priority}</div>
        <div><strong>Available:</strong> {new Date(job.availableAt).toLocaleString()}</div>
        {job.scheduledAt && <div><strong>Scheduled:</strong> {new Date(job.scheduledAt).toLocaleString()}</div>}
        {job.recurringCron && <div><strong>Cron:</strong> {job.recurringCron}</div>}
        {job.claimedById && <div><strong>Worker:</strong> {job.claimedById}</div>}
        {job.lastError && <div className="full-width error-text"><strong>Error:</strong> {job.lastError}</div>}
        {job.failureSummary && <div className="full-width"><strong>Failure Summary:</strong> {job.failureSummary}</div>}
      </div>

      {job.dependencies?.length > 0 && (
        <>
          <h2>Dependencies</h2>
          <ul>
            {job.dependencies.map((d: any) => (
              <li key={d.id}>
                <Link to={`/jobs/${d.dependsOnJob.id}`}>{d.dependsOnJob.id.slice(0, 8)}…</Link>
                — <StatusBadge status={d.dependsOnJob.status} />
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>Executions</h2>
      <table>
        <thead>
          <tr><th>Attempt</th><th>Status</th><th>Worker</th><th>Duration</th><th>Started</th><th>Error</th></tr>
        </thead>
        <tbody>
          {(job.executions || []).map((ex: any) => (
            <tr key={ex.id}>
              <td>{ex.attempt}</td>
              <td><StatusBadge status={ex.status} /></td>
              <td>{ex.workerId?.slice(0, 8) || "—"}</td>
              <td>{ex.durationMs ? `${ex.durationMs}ms` : "—"}</td>
              <td>{new Date(ex.startedAt).toLocaleString()}</td>
              <td>{ex.error || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Logs</h2>
      <div className="log-list">
        {(job.logs || []).map((log: any) => (
          <div key={log.id} className={`log-entry log-${log.level.toLowerCase()}`}>
            <span className="log-time">{new Date(log.createdAt).toLocaleString()}</span>
            <span className="log-level">[{log.level}]</span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>

      <Link to="/jobs" className="back-link">← Back to jobs</Link>
    </div>
  );
}
