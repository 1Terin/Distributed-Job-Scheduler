import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useSocket } from "../utils/SocketContext";
import { StatusBadge } from "../components/StatusBadge";

export default function Jobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [queues, setQueues] = useState<any[]>([]);
  const [queueId, setQueueId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ queueId: "", type: "IMMEDIATE", payload: '{"task":"example"}', scheduledAt: "", recurringCron: "", dependsOnIds: "" });
  const { lastEvent } = useSocket();

  const load = useCallback(() => {
    const params: any = { page, limit: 20 };
    if (status) params.status = status;
    if (queueId) params.queueId = queueId;
    axios.get("/api/jobs", { params }).then((r) => {
      setJobs(r.data?.items || []);
      setTotal(r.data?.total || 0);
    }).catch(() => setJobs([]));
  }, [page, status, queueId]);

  useEffect(() => {
    axios.get("/api/queues").then((r) => setQueues(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    load();
  }, [load]);

  useEffect(() => {
    if (!lastEvent) return;
    if (["job_created", "job_claimed", "job_running", "job_completed", "job_requeued", "job_dead_letter", "job_retried", "job_cancelled"].includes(lastEvent.type)) {
      load();
    }
  }, [lastEvent, load]);

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = {
      queueId: form.queueId,
      type: form.type,
      payload: JSON.parse(form.payload),
    };
    if (form.type === "DELAYED" || form.type === "SCHEDULED") body.scheduledAt = form.scheduledAt;
    if (form.type === "RECURRING") {
      body.recurringCron = form.recurringCron;
      body.scheduledAt = form.scheduledAt || new Date().toISOString();
      body.type = "RECURRING";
    }
    if (form.dependsOnIds.trim()) {
      body.dependsOnIds = form.dependsOnIds.split(",").map((s) => s.trim()).filter(Boolean);
    }
    await axios.post("/api/jobs", body);
    setShowCreate(false);
    load();
  };

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div>
      <div className="page-header">
        <h1>Jobs</h1>
        <button onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "Create Job"}</button>
      </div>

      {showCreate && (
        <form className="card form-card" onSubmit={createJob}>
          <label>Queue
            <select value={form.queueId} onChange={(e) => setForm({ ...form, queueId: e.target.value })} required>
              <option value="">Select queue</option>
              {queues.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
          </label>
          <label>Type
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="IMMEDIATE">Immediate</option>
              <option value="DELAYED">Delayed</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="RECURRING">Recurring (cron)</option>
              <option value="BATCH">Batch</option>
            </select>
          </label>
          {(form.type === "DELAYED" || form.type === "SCHEDULED" || form.type === "RECURRING") && (
            <label>Scheduled At
              <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} required />
            </label>
          )}
          {form.type === "RECURRING" && (
            <label>Cron Expression
              <input value={form.recurringCron} onChange={(e) => setForm({ ...form, recurringCron: e.target.value })} placeholder="*/5 * * * *" required />
            </label>
          )}
          <label>Payload (JSON)
            <textarea value={form.payload} onChange={(e) => setForm({ ...form, payload: e.target.value })} rows={3} />
          </label>
          <label>Depends on job IDs (comma-separated, optional)
            <input value={form.dependsOnIds} onChange={(e) => setForm({ ...form, dependsOnIds: e.target.value })} placeholder="uuid1, uuid2" />
          </label>
          <button type="submit">Submit</button>
        </form>
      )}

      <div className="filters">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {["QUEUED", "SCHEDULED", "CLAIMED", "RUNNING", "COMPLETED", "FAILED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={queueId} onChange={(e) => { setQueueId(e.target.value); setPage(1); }}>
          <option value="">All queues</option>
          {queues.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Status</th>
            <th>Queue</th>
            <th>Priority</th>
            <th>Attempt</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td><Link to={`/jobs/${job.id}`}>{job.id.slice(0, 8)}…</Link></td>
              <td>{job.type}</td>
              <td><StatusBadge status={job.status} /></td>
              <td>{queues.find((q) => q.id === job.queueId)?.name || job.queueId.slice(0, 8)}</td>
              <td>{job.priority}</td>
              <td>{job.attempt}/{job.maxAttempts}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
        <span>Page {page} of {totalPages} ({total} jobs)</span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
