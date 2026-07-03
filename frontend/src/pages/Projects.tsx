import { useEffect, useState } from "react";
import axios from "axios";

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = () => {
    axios.get("/api/projects").then((r) => setProjects(Array.isArray(r.data) ? r.data : [])).catch(() => setProjects([]));
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post("/api/projects", { name, description });
    setShowCreate(false);
    setName("");
    setDescription("");
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Projects</h1>
        <button onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "Create Project"}</button>
      </div>

      {showCreate && (
        <form className="card form-card" onSubmit={create}>
          <label>Name <input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>Description <input value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          <button type="submit">Create</button>
        </form>
      )}

      <div className="grid">
        {projects.map((p) => (
          <div key={p.id} className="card">
            <h3>{p.name}</h3>
            <p>{p.description || "No description"}</p>
            <p>Queues: {p._count?.queues ?? 0} · Jobs: {p._count?.jobs ?? 0}</p>
            <p className="muted">Created {new Date(p.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
