import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useSocket } from "../utils/SocketContext";

export default function DeadLetter() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const { lastEvent } = useSocket();

  const load = useCallback(() => {
    axios.get("/api/jobs/dead-letter", { params: { page, limit: 20 } }).then((r) => {
      setItems(r.data?.items || []);
      setTotal(r.data?.total || 0);
    }).catch(() => setItems([]));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (lastEvent?.type === "job_dead_letter" || lastEvent?.type === "job_retried") load();
  }, [lastEvent, load]);

  const retry = async (jobId: string) => {
    await axios.post(`/api/jobs/${jobId}/retry`);
    load();
  };

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div>
      <h1>Dead Letter Queue</h1>
      <table>
        <thead>
          <tr>
            <th>Job</th>
            <th>Type</th>
            <th>Reason</th>
            <th>Failed At</th>
            <th>Summary</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((dl) => (
            <tr key={dl.id}>
              <td><Link to={`/jobs/${dl.jobId}`}>{dl.jobId.slice(0, 8)}…</Link></td>
              <td>{dl.job?.type}</td>
              <td className="error-text">{dl.reason}</td>
              <td>{new Date(dl.failedAt).toLocaleString()}</td>
              <td>{dl.job?.failureSummary?.slice(0, 80) || "—"}</td>
              <td><button onClick={() => retry(dl.jobId)}>Retry</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
        <span>Page {page} of {totalPages} ({total} entries)</span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
