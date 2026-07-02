import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Queues from "./pages/Queues";

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/">Job Scheduler</Link>
        <nav>
          <Link to="/queues">Queues</Link>
          <Link to="/jobs">Jobs</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/queues" element={<Queues />} />
          <Route path="/jobs" element={<Jobs />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
