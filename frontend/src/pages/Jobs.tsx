import { useEffect, useState } from "react";
import axios from "axios";

export default function Jobs() {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    axios
      .get("/api/jobs")
      .then((response) => setJobs(Array.isArray(response.data?.items) ? response.data.items : []))
      .catch((error) => {
        console.error(error);
        setJobs([]);
      });
  }, []);

  return (
    <div>
      <h1>Jobs</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Status</th>
            <th>Queue</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>{job.id}</td>
              <td>{job.type}</td>
              <td>{job.status}</td>
              <td>{job.queueId}</td>
              <td>{job.priority}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
