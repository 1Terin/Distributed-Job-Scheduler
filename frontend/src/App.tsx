import { Routes, Route, Link, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Queues from "./pages/Queues";
import JobDetails from "./pages/JobDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Projects from "./pages/Projects";
import Workers from "./pages/Workers";
import DeadLetter from "./pages/DeadLetter";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { SocketProvider, useSocket } from "./utils/SocketContext";
import ProtectedRoute from "./components/ProtectedRoute";

function AppShell() {
  const { token, user, logout } = useAuth();
  const { lastEvent, connected } = useSocket();

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          Job Scheduler
        </Link>
        <nav>
          <Link to="/">Dashboard</Link>
          <Link to="/projects">Projects</Link>
          <Link to="/queues">Queues</Link>
          <Link to="/jobs">Jobs</Link>
          <Link to="/dead-letter">DLQ</Link>
          <Link to="/workers">Workers</Link>
          {token ? (
            <span className="auth-area">
              <span className="user-badge">
                {user?.name} ({user?.role})
              </span>
              <span className={`ws-dot ${connected ? "online" : "offline"}`} title={connected ? "Live" : "Disconnected"} />
              <button onClick={logout}>Sign out</button>
            </span>
          ) : (
            <Link to="/login">Sign in</Link>
          )}
        </nav>
      </header>
      {lastEvent && (
        <div className="live-bar">
          Live: <strong>{lastEvent.type}</strong>
          {lastEvent.jobId ? ` — job ${String(lastEvent.jobId).slice(0, 8)}…` : ""}
        </div>
      )}
      <main>
        <Routes>
          <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
          <Route path="/register" element={token ? <Navigate to="/" /> : <Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
          <Route path="/queues" element={<ProtectedRoute><Queues /></ProtectedRoute>} />
          <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
          <Route path="/jobs/:id" element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />
          <Route path="/dead-letter" element={<ProtectedRoute><DeadLetter /></ProtectedRoute>} />
          <Route path="/workers" element={<ProtectedRoute><Workers /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppShell />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
