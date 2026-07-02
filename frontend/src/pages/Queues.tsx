import { useEffect, useState } from "react";
import axios from "axios";

export default function Queues() {
  const [queues, setQueues] = useState<any[]>([]);

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
      <h1>Queues</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Priority</th>
            <th>Concurrency</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {queues.map((queue) => (
            <tr key={queue.id}>
              <td>{queue.name}</td>
              <td>{queue.priority}</td>
              <td>{queue.concurrency}</td>
              <td>{queue.paused ? "Paused" : "Active"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
