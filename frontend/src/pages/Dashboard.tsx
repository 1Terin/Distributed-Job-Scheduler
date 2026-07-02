import { useEffect, useState } from "react";
import axios from "axios";

interface QueueSummary {
  id: string;
  name: string;
  paused: boolean;
  concurrency: number;
  priority: number;
  statistics?: { totalQueued: number; totalCompleted: number; totalFailed: number };
}

export default function Dashboard() {
  const [queues, setQueues] = useState<QueueSummary[]>([]);

  useEffect(() => {
    axios
      .get("/api/queues")
      .then((response) => setQueues(Array.isArray(response.data) ? response.data : []))
      .catch((error) => {
        console.error(error);
        setQueues([]);
      });
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <section>
        <h2>Queue Health</h2>
        <div className="grid">
          {queues.map((queue) => (
            <div key={queue.id} className="card">
              <h3>{queue.name}</h3>
              <p>Status: {queue.paused ? "Paused" : "Active"}</p>
              <p>Priority: {queue.priority}</p>
              <p>Concurrency: {queue.concurrency}</p>
              <p>Queued: {queue.statistics?.totalQueued ?? 0}</p>
              <p>Completed: {queue.statistics?.totalCompleted ?? 0}</p>
              <p>Failed: {queue.statistics?.totalFailed ?? 0}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
